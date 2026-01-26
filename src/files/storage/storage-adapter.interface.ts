import { Readable } from 'stream';

export interface StorageGetResult {
  stream: Readable;
  metadata: {
    mimeType: string;
    size: number;
    etag?: string;
    lastModified?: Date;
  };
}

export interface StoragePutResult {
  key: string;
  etag?: string;
  versionId?: string;
}

export interface StorageAdapter {
  /**
   * Retrieves a file stream from storage
   * @throws {NotFoundException} if file doesn't exist
   * @throws {InternalServerErrorException} if storage error occurs
   */
  get(key: string, bucket?: string): Promise<StorageGetResult>;

  /**
   * Uploads a file to storage
   * @throws {InternalServerErrorException} if upload fails
   */
  put(
    stream: Readable,
    key: string,
    options: {
      metadata: { mimeType: string; size: number };
      access: 'public' | 'private';
      bucket?: string;
    },
  ): Promise<StoragePutResult>;

  /**
   * Deletes a file from storage
   */
  delete(key: string, bucket?: string): Promise<void>;

  /**
   * Generates a temporary signed URL for direct access
   */
  getRedirectUrl?(
    key: string,
    bucket?: string,
    options?: { expiresInSeconds: number },
  ): Promise<string | null>;

  /**
   * Checks if a file exists in storage
   * ⚠️ Do not use in hot paths - for ops/tooling only
   */
  exists?(key: string, bucket?: string): Promise<boolean>;
}
