import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Readable } from 'stream';
import type {
  StorageAdapter,
  StorageGetResult,
  StoragePutResult,
} from '../storage-adapter.interface';

@Injectable()
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly logger = new Logger(SupabaseStorageAdapter.name);
  private readonly client: SupabaseClient;
  private readonly defaultBucket: string;

  constructor(private readonly config: ConfigService) {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    const supabaseKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.defaultBucket = this.config.get<string>(
      'SUPABASE_STORAGE_BUCKET',
      'files',
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment',
      );
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    });

    this.logger.log(
      `SupabaseStorageAdapter initialized with bucket: ${this.defaultBucket}`,
    );
  }

  async get(key: string, bucket?: string): Promise<StorageGetResult> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const { data: files, error: listError } = await this.client.storage
        .from(bucketName)
        .list('', {
          search: key,
        });

      if (listError || !files || files.length === 0) {
        throw new NotFoundException(`File not found: ${key}`);
      }

      const fileInfo = files[0];

      const { data, error } = await this.client.storage
        .from(bucketName)
        .download(key);

      if (error || !data) {
        this.logger.error(`Failed to download file: ${key}`, error);
        throw new NotFoundException(`File not found: ${key}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);

      return {
        stream,
        metadata: {
          mimeType: fileInfo.metadata?.mimetype || 'application/octet-stream',
          size: fileInfo.metadata?.size || buffer.length,
          lastModified: fileInfo.updated_at
            ? new Date(fileInfo.updated_at)
            : new Date(),
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Storage get failed for key: ${key}`, error);
      throw new InternalServerErrorException('Failed to retrieve file');
    }
  }

  async put(
    stream: Readable,
    key: string,
    options: {
      metadata: { mimeType: string; size: number };
      access: 'public' | 'private';
      bucket?: string;
    },
  ): Promise<StoragePutResult> {
    const bucketName = options.bucket || this.defaultBucket;

    try {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const { data, error } = await this.client.storage
        .from(bucketName)
        .upload(key, buffer, {
          contentType: options.metadata.mimeType,
          upsert: false,
        });

      if (error) {
        this.logger.error(`Upload failed for key: ${key}`, error);
        throw new InternalServerErrorException(
          `Upload failed: ${error.message}`,
        );
      }

      this.logger.debug(`File uploaded successfully: ${key}`);

      return {
        key: data.path,
        etag: data.id,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      this.logger.error(`Storage put failed for key: ${key}`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async delete(key: string, bucket?: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const { error } = await this.client.storage
        .from(bucketName)
        .remove([key]);

      if (error) {
        this.logger.warn(`Delete failed for key: ${key}`, error);
      } else {
        this.logger.debug(`File deleted: ${key}`);
      }
    } catch (error) {
      this.logger.warn(`Storage delete failed for key: ${key}`, error);
    }
  }

  async getRedirectUrl(
    key: string,
    bucket?: string,
    options?: { expiresInSeconds: number },
  ): Promise<string | null> {
    const bucketName = bucket || this.defaultBucket;
    const expiresIn = options?.expiresInSeconds || 3600;

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUrl(key, expiresIn);

      if (error || !data) {
        this.logger.warn(`Failed to create signed URL for: ${key}`, error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      this.logger.warn(`Failed to generate redirect URL for: ${key}`, error);
      return null;
    }
  }

  async exists(key: string, bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const { data, error } = await this.client.storage
        .from(bucketName)
        .list('', {
          search: key,
        });

      return !error && data && data.length > 0;
    } catch (error) {
      this.logger.warn(`Exists check failed for: ${key}`, error);
      return false;
    }
  }
}
