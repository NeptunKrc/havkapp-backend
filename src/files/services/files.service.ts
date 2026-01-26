import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Readable } from 'stream';

import { FileEntity } from '../entities/file.entity';
import { FileStatus, FileOwnerType } from '../files.contract';
import { STORAGE_ADAPTER } from '../storage/storage.constants';
import type { StorageAdapter } from '../storage/storage-adapter.interface';

export type FileReadResult =
  | {
      mode: 'redirect';
      redirectUrl: string;
      mimeType: string;
      size: number;
    }
  | {
      mode: 'stream';
      stream: Readable;
      mimeType: string;
      size: number;
    };

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepo: Repository<FileEntity>,
    @Inject(STORAGE_ADAPTER)
    private readonly storage: StorageAdapter,
    private readonly dataSource: DataSource,
  ) {}

  async read(options: {
    fileId: string;
    clubId: string;
    canRead: boolean;
    preferRedirect?: boolean;
  }): Promise<FileReadResult> {
    const { fileId, clubId, canRead, preferRedirect } = options;

    if (!canRead) {
      throw new ForbiddenException('Access denied to file');
    }

    const file = await this.filesRepo.findOne({
      where: { id: fileId, clubId },
      select: [
        'id',
        'status',
        'storageKey',
        'bucket',
        'detectedMimeType',
        'size',
      ],
    });

    if (!file || file.status !== FileStatus.ATTACHED) {
      throw new NotFoundException('File not found or not available');
    }

    if (preferRedirect && this.storage.getRedirectUrl) {
      try {
        const url = await this.storage.getRedirectUrl(
          file.storageKey,
          file.bucket,
          { expiresInSeconds: 3600 },
        );

        if (url) {
          this.logger.debug(`Redirecting to signed URL for file: ${fileId}`);
          return {
            mode: 'redirect',
            redirectUrl: url,
            mimeType: file.detectedMimeType,
            size: file.size,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to generate redirect URL for file ${fileId}, falling back to stream`,
          error,
        );
      }
    }

    const { stream, metadata } = await this.storage.get(
      file.storageKey,
      file.bucket,
    );

    this.logger.debug(`Streaming file: ${fileId} (club: ${clubId})`);

    return {
      mode: 'stream',
      stream,
      mimeType: metadata.mimeType,
      size: metadata.size,
    };
  }

  async attach(
    fileId: string,
    clubId: string,
    ownerId: string,
    ownerType: FileOwnerType,
  ): Promise<FileEntity> {
    const result = await this.filesRepo.update(
      { id: fileId, clubId, status: FileStatus.UPLOADED },
      {
        ownerId,
        ownerType,
        status: FileStatus.ATTACHED,
        attachedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new NotFoundException('File not found or already attached');
    }

    this.logger.log(
      `File attached: ${fileId} to ${ownerType}:${ownerId} (club: ${clubId})`,
    );

    const file = await this.filesRepo.findOneOrFail({
      where: { id: fileId, clubId },
    });

    return file;
  }

  async detach(fileId: string, clubId: string): Promise<void> {
    const file = await this.filesRepo.findOne({
      where: { id: fileId, clubId, status: FileStatus.ATTACHED },
    });

    if (!file) {
      throw new NotFoundException('File not found or not attached');
    }

    await this.filesRepo.update(
      { id: fileId, clubId },
      {
        ownerId: undefined,
        ownerType: undefined,
        status: FileStatus.UPLOADED,
        attachedAt: undefined,
      },
    );

    this.logger.log(`File detached: ${fileId} (club: ${clubId})`);
  }

  async markForDeletion(fileId: string, clubId: string): Promise<void> {
    const result = await this.filesRepo.update(
      { id: fileId, clubId },
      {
        status: FileStatus.DELETING,
        deletedAt: new Date(),
      },
    );

    if (result.affected === 0) {
      throw new NotFoundException('File not found');
    }

    this.logger.log(`File marked for deletion: ${fileId} (club: ${clubId})`);
  }

  async deleteByOwner(
    clubId: string,
    ownerId: string,
    ownerType: FileOwnerType,
  ): Promise<number> {
    const result = await this.filesRepo.update(
      { clubId, ownerId, ownerType, status: FileStatus.ATTACHED },
      {
        status: FileStatus.DELETING,
        deletedAt: new Date(),
      },
    );

    const count = result.affected ?? 0;

    this.logger.log(
      `Marked ${count} files for deletion for ${ownerType}:${ownerId} (club: ${clubId})`,
    );

    return count;
  }

  async getMetadata(fileId: string, clubId: string): Promise<FileEntity> {
    const file = await this.filesRepo.findOne({
      where: { id: fileId, clubId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }

  async findByOwner(
    clubId: string,
    ownerId: string,
    ownerType: FileOwnerType,
  ): Promise<FileEntity[]> {
    return this.filesRepo.find({
      where: { clubId, ownerId, ownerType, status: FileStatus.ATTACHED },
      order: { attachedAt: 'DESC' },
    });
  }

  async validateAttached(fileId: string, clubId: string): Promise<boolean> {
    const file = await this.filesRepo.findOne({
      where: { id: fileId, clubId, status: FileStatus.ATTACHED },
      select: ['id'],
    });

    return !!file;
  }

  async findByClub(
    clubId: string,
    options?: {
      status?: FileStatus;
      ownerType?: FileOwnerType;
      limit?: number;
    },
  ): Promise<FileEntity[]> {
    const where: any = { clubId };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.ownerType) {
      where.ownerType = options.ownerType;
    }

    return this.filesRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 100,
    });
  }

  async getClubStorageStats(clubId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byStatus: Record<FileStatus, number>;
    byOwnerType: Record<string, number>;
  }> {
    const totals = await this.filesRepo
      .createQueryBuilder('file')
      .select('COUNT(*)', 'totalFiles')
      .addSelect('COALESCE(SUM(file.size), 0)', 'totalSize')
      .where('file.clubId = :clubId', { clubId })
      .getRawOne<{ totalFiles: string; totalSize: string }>();

    const statusCounts = await this.filesRepo
      .createQueryBuilder('file')
      .select('file.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('file.clubId = :clubId', { clubId })
      .groupBy('file.status')
      .getRawMany<{ status: FileStatus; count: string }>();

    const ownerTypeCounts = await this.filesRepo
      .createQueryBuilder('file')
      .select('file.ownerType', 'ownerType')
      .addSelect('COUNT(*)', 'count')
      .where('file.clubId = :clubId', { clubId })
      .andWhere('file.ownerType IS NOT NULL')
      .groupBy('file.ownerType')
      .getRawMany<{ ownerType: string; count: string }>();

    const byStatus = {} as Record<FileStatus, number>;
    statusCounts.forEach((row) => {
      byStatus[row.status] = parseInt(row.count, 10);
    });

    const byOwnerType = {} as Record<string, number>;
    ownerTypeCounts.forEach((row) => {
      byOwnerType[row.ownerType] = parseInt(row.count, 10);
    });

    return {
      totalFiles: parseInt(totals?.totalFiles ?? '0', 10),
      totalSize: parseInt(totals?.totalSize ?? '0', 10),
      byStatus,
      byOwnerType,
    };
  }
}
