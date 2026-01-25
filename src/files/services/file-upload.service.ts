import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Readable, PassThrough, pipeline } from 'stream';
import { promisify } from 'util';
import { randomUUID, createHash } from 'crypto';
import { fileTypeStream } from 'file-type';
import { ConfigService } from '@nestjs/config';

import { FileEntity } from '../entities/file.entity';
import { FileStatus, StorageProvider } from '../files.contract';
import type { StorageAdapter } from '../storage/storage-adapter.interface';
import { STORAGE_ADAPTER } from '../storage/storage.constants';
import { FileQuotaService } from './file-quota.service';

const pipelineAsync = promisify(pipeline);

export interface UploadResult {
  fileId: string;
  checksum: string;
  size: number;
  mimeType: string;
}

@Injectable()
export class FileUploadService {
  private readonly logger = new Logger(FileUploadService.name);
  private readonly maxFileSize: number;
  private readonly streamThreshold: number;
  private readonly allowedMimeTypes: Set<string>;

  constructor(
    @InjectRepository(FileEntity)
    private readonly filesRepo: Repository<FileEntity>,
    @Inject(STORAGE_ADAPTER)
    private readonly storage: StorageAdapter,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly quotaService: FileQuotaService,
  ) {
    this.maxFileSize = this.configService.get<number>(
      'FILE_UPLOAD_MAX_SIZE',
      50 * 1024 * 1024,
    );

    this.streamThreshold = this.configService.get<number>(
      'FILE_STREAM_THRESHOLD',
      10 * 1024 * 1024,
    );

    const allowed = this.configService.get<string>('ALLOWED_MIME_TYPES', '');
    this.allowedMimeTypes = new Set(
      allowed
        ? allowed.split(',').map((t) => t.trim())
        : [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'text/plain',
        ],
    );

    this.logger.log(
      `FileUploadService: maxSize=${this.maxFileSize}, streamThreshold=${this.streamThreshold}`,
    );
  }

  private resolveProvider(): StorageProvider {
    const provider = this.configService.get<string>('STORAGE_PROVIDER', 'local');
    switch (provider.toLowerCase()) {
      case 'supabase':
        return StorageProvider.SUPABASE;
      case 's3':
        return StorageProvider.S3;
      case 'local':
        return StorageProvider.LOCAL;
      default:
        this.logger.warn(`Unknown provider "${provider}", falling back to LOCAL`);
        return StorageProvider.LOCAL;
    }
  }

  async upload(options: {
    clubId: string;
    stream: Readable;
    originalName: string;
    declaredMimeType: string;
    size: number;
    bucket?: string;
  }): Promise<UploadResult> {
    if (!options.clubId) {
      throw new BadRequestException('clubId is required');
    }

    if (!options.stream || !options.size) {
      throw new BadRequestException('Invalid upload payload');
    }

    if (options.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxFileSize} bytes`,
      );
    }

    if (options.size === 0) {
      throw new BadRequestException('Empty file not allowed');
    }

    if (!options.originalName || options.originalName.length > 500) {
      throw new BadRequestException('Invalid file name');
    }

    await this.quotaService.checkQuota(options.clubId, options.size);

    const useStreaming = options.size > this.streamThreshold;

    this.logger.debug(
      `Upload strategy: ${useStreaming ? 'STREAMING' : 'BUFFER'} (${options.size} bytes, club: ${options.clubId})`,
    );

    if (useStreaming) {
      return this.uploadWithStreaming(options);
    } else {
      return this.uploadWithBuffer(options);
    }
  }

  private async uploadWithBuffer(options: {
    clubId: string;
    stream: Readable;
    originalName: string;
    declaredMimeType: string;
    size: number;
    bucket?: string;
  }): Promise<UploadResult> {
    const storageKey = randomUUID();
    const provider = this.resolveProvider();

    let detectedMimeType: string;
    let validatedStream: Readable;

    try {
      const typeStream = await fileTypeStream(options.stream);
      detectedMimeType = typeStream.fileType?.mime ?? options.declaredMimeType;
      validatedStream = typeStream;

      if (!this.allowedMimeTypes.has(detectedMimeType)) {
        throw new BadRequestException(
          `File type "${detectedMimeType}" is not allowed`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('MIME type detection failed', error);
      throw new BadRequestException('Invalid file format');
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;

    try {
      for await (const chunk of validatedStream) {
        chunks.push(chunk);
        totalSize += chunk.length;

        if (totalSize > this.maxFileSize) {
          throw new BadRequestException('File size limit exceeded');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to read stream', error);
      throw new InternalServerErrorException('Failed to process file');
    }

    const buffer = Buffer.concat(chunks);
    const checksum = createHash('sha256').update(buffer).digest('hex');

    try {
      await this.storage.put(Readable.from(buffer), storageKey, {
        metadata: { mimeType: detectedMimeType, size: buffer.length },
        access: 'private',
        bucket: options.bucket,
      });

      this.logger.debug(`Buffer upload completed: ${storageKey}`);
    } catch (error) {
      this.logger.error('Storage upload failed', error);
      throw new InternalServerErrorException('Storage upload failed');
    }

    return this.saveFileRecord({
      clubId: options.clubId,
      originalName: options.originalName,
      declaredMimeType: options.declaredMimeType,
      detectedMimeType,
      size: buffer.length,
      checksum,
      storageKey,
      provider,
      bucket: options.bucket,
    });
  }

  private async uploadWithStreaming(options: {
    clubId: string;
    stream: Readable;
    originalName: string;
    declaredMimeType: string;
    size: number;
    bucket?: string;
  }): Promise<UploadResult> {
    const storageKey = randomUUID();
    const provider = this.resolveProvider();

    let detectedMimeType: string;
    let validatedStream: Readable;

    try {
      const typeStream = await fileTypeStream(options.stream);
      detectedMimeType = typeStream.fileType?.mime ?? options.declaredMimeType;
      validatedStream = typeStream;

      if (!this.allowedMimeTypes.has(detectedMimeType)) {
        throw new BadRequestException(
          `File type "${detectedMimeType}" is not allowed`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('MIME type detection failed', error);
      throw new BadRequestException('Invalid file format');
    }

    const hash = createHash('sha256');
    let processedSize = 0;

    const checksumAndSizeTracker = new PassThrough();
    checksumAndSizeTracker.on('data', (chunk) => {
      hash.update(chunk);
      processedSize += chunk.length;

      if (processedSize > this.maxFileSize) {
        checksumAndSizeTracker.destroy(new Error('File size limit exceeded'));
      }
    });

    try {
      const uploadPromise = this.storage.put(
        checksumAndSizeTracker,
        storageKey,
        {
          metadata: {
            mimeType: detectedMimeType,
            size: options.size,
          },
          access: 'private',
          bucket: options.bucket,
        },
      );

      await pipelineAsync(validatedStream, checksumAndSizeTracker);

      await uploadPromise;

      const checksum = hash.digest('hex');

      this.logger.debug(
        `Streaming upload completed: ${storageKey} (actual size: ${processedSize})`,
      );

      return this.saveFileRecord({
        clubId: options.clubId,
        originalName: options.originalName,
        declaredMimeType: options.declaredMimeType,
        detectedMimeType,
        size: processedSize,
        checksum,
        storageKey,
        provider,
        bucket: options.bucket,
      });
    } catch (error) {
      await this.storage.delete(storageKey, options.bucket).catch((err) => {
        this.logger.warn(`Cleanup failed after streaming error: ${storageKey}`, err);
      });

      this.logger.error('Streaming upload failed', error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  private async saveFileRecord(data: {
    clubId: string;
    originalName: string;
    declaredMimeType: string;
    detectedMimeType: string;
    size: number;
    checksum: string;
    storageKey: string;
    provider: StorageProvider;
    bucket?: string;
  }): Promise<UploadResult> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Deduplication removed to prevent ownership conflicts
      // Each upload creates a unique file record

      const file = queryRunner.manager.create(FileEntity, {
        clubId: data.clubId,
        originalName: data.originalName,
        mimeType: data.declaredMimeType,
        detectedMimeType: data.detectedMimeType,
        size: data.size,
        checksum: data.checksum,
        storageKey: data.storageKey,
        storageProvider: data.provider,
        bucket: data.bucket,
        status: FileStatus.UPLOADED,
      });

      const saved = await queryRunner.manager.save(file);
      await queryRunner.commitTransaction();

      this.logger.log(
        `File record saved: ${saved.id} (club: ${data.clubId}, size: ${data.size})`,
      );

      return {
        fileId: saved.id,
        checksum: saved.checksum,
        size: saved.size,
        mimeType: saved.detectedMimeType,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      await this.storage.delete(data.storageKey, data.bucket).catch((err) => {
        this.logger.error(
          `Failed to cleanup storage after DB error: ${data.storageKey}`,
          err,
        );
      });

      this.logger.error('Database transaction failed during file save', error);
      throw new InternalServerErrorException('File upload failed');
    } finally {
      await queryRunner.release();
    }
  }
}