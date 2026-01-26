import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileEntity } from '../entities/file.entity';
import { FileStatus } from '../files.contract';
import { STORAGE_ADAPTER } from '../storage/storage.constants';
import type { StorageAdapter } from '../storage/storage-adapter.interface';

@Injectable()
export class FileCleanupService {
  private readonly logger = new Logger(FileCleanupService.name);
  private readonly orphanTtlHours: number;
  private readonly batchSize: number;

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepo: Repository<FileEntity>,
    @Inject(STORAGE_ADAPTER)
    private readonly storage: StorageAdapter,
    private readonly configService: ConfigService,
  ) {
    this.orphanTtlHours = this.configService.get<number>(
      'ORPHAN_TTL_HOURS',
      24,
    );

    this.batchSize = this.configService.get<number>('CLEANUP_BATCH_SIZE', 100);

    this.logger.log(
      `FileCleanupService: orphanTTL=${this.orphanTtlHours}h, batch=${this.batchSize}`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOrphanedFiles() {
    this.logger.log('Starting orphaned files cleanup...');

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - this.orphanTtlHours);

    try {
      const result = await this.filesRepo
        .createQueryBuilder()
        .update(FileEntity)
        .set({
          status: FileStatus.DELETING,
          deletedAt: new Date(),
        })
        .where({
          status: FileStatus.UPLOADED,
          createdAt: LessThan(cutoffDate),
        })
        .returning(['id', 'clubId', 'storageKey', 'bucket'])
        .execute();

      const claimedFiles = result.raw as Array<{
        id: string;
        clubId: string;
        storageKey: string;
        bucket?: string;
      }>;

      this.logger.log(
        `Claimed ${claimedFiles.length} orphaned files for cleanup`,
      );

      if (claimedFiles.length === 0) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const failedIds: string[] = [];

      for (const file of claimedFiles) {
        try {
          await this.storage.delete(file.storageKey, file.bucket);
          successCount++;
          this.logger.debug(
            `Deleted from storage: ${file.id} (club: ${file.clubId})`,
          );
        } catch (error) {
          errorCount++;
          failedIds.push(file.id);
          this.logger.error(
            `Failed to delete from storage: ${file.id} (club: ${file.clubId})`,
            error,
          );
        }
      }

      if (successCount > 0) {
        const successIds = claimedFiles
          .filter((f) => !failedIds.includes(f.id))
          .map((f) => f.id);

        await this.filesRepo.update(
          { id: In(successIds) },
          { status: FileStatus.DELETED },
        );

        this.logger.log(`Marked ${successCount} files as DELETED in DB`);
      }

      if (failedIds.length > 0) {
        await this.filesRepo.update(
          { id: In(failedIds) },
          {
            status: FileStatus.UPLOADED,
            deletedAt: undefined,
          },
        );

        this.logger.warn(
          `Reverted ${failedIds.length} failed files to UPLOADED`,
        );
      }

      this.logger.log(
        `Orphan cleanup completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Orphaned files cleanup job failed', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async deleteMarkedFiles() {
    this.logger.log('Starting marked files deletion...');

    try {
      const markedFiles = await this.filesRepo.find({
        where: { status: FileStatus.DELETING },
        select: ['id', 'clubId', 'storageKey', 'bucket'],
        take: this.batchSize,
      });

      this.logger.log(`Found ${markedFiles.length} files in DELETING status`);

      if (markedFiles.length === 0) {
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const successIds: string[] = [];

      for (const file of markedFiles) {
        try {
          await this.storage.delete(file.storageKey, file.bucket);
          successIds.push(file.id);
          successCount++;
          this.logger.debug(
            `Deleted from storage: ${file.id} (club: ${file.clubId})`,
          );
        } catch (error) {
          errorCount++;
          this.logger.error(
            `Failed to delete from storage: ${file.id} (club: ${file.clubId})`,
            error,
          );
        }
      }

      if (successIds.length > 0) {
        await this.filesRepo.update(
          { id: In(successIds) },
          { status: FileStatus.DELETED },
        );

        this.logger.log(`Marked ${successCount} files as DELETED`);
      }

      this.logger.log(
        `Marked files deletion completed. Success: ${successCount}, Errors: ${errorCount}`,
      );
    } catch (error) {
      this.logger.error('Marked files deletion job failed', error);
    }
  }

  async manualCleanup(): Promise<{
    orphanedCleaned: number;
    markedDeleted: number;
  }> {
    this.logger.log('Manual cleanup triggered');

    const beforeOrphaned = await this.filesRepo.count({
      where: { status: FileStatus.UPLOADED },
    });

    const beforeDeleting = await this.filesRepo.count({
      where: { status: FileStatus.DELETING },
    });

    await this.cleanupOrphanedFiles();
    await this.deleteMarkedFiles();

    const afterOrphaned = await this.filesRepo.count({
      where: { status: FileStatus.UPLOADED },
    });

    const afterDeleting = await this.filesRepo.count({
      where: { status: FileStatus.DELETING },
    });

    return {
      orphanedCleaned: beforeOrphaned - afterOrphaned,
      markedDeleted: beforeDeleting - afterDeleting,
    };
  }

  async cleanupByClub(clubId: string): Promise<{
    claimed: number;
    deleted: number;
    failed: number;
  }> {
    this.logger.log(`Manual cleanup for club: ${clubId}`);

    const result = await this.filesRepo
      .createQueryBuilder()
      .update(FileEntity)
      .set({
        status: FileStatus.DELETING,
        deletedAt: new Date(),
      })
      .where({
        clubId,
        status: FileStatus.UPLOADED,
      })
      .returning(['id', 'storageKey', 'bucket'])
      .execute();

    const claimedFiles = result.raw as Array<{
      id: string;
      storageKey: string;
      bucket?: string;
    }>;

    const claimed = claimedFiles.length;
    let deleted = 0;
    let failed = 0;
    const successIds: string[] = [];

    for (const file of claimedFiles) {
      try {
        await this.storage.delete(file.storageKey, file.bucket);
        successIds.push(file.id);
        deleted++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to delete file: ${file.id}`, error);
      }
    }

    if (successIds.length > 0) {
      await this.filesRepo.update(
        { id: In(successIds) },
        { status: FileStatus.DELETED },
      );
    }

    this.logger.log(
      `Club cleanup: claimed=${claimed}, deleted=${deleted}, failed=${failed}`,
    );

    return { claimed, deleted, failed };
  }
}
