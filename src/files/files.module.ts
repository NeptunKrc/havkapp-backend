import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { FileEntity } from './entities/file.entity';
import { FilesController } from './files.controller';
import { FileUploadService } from './services/file-upload.service';
import { FilesService } from './services/files.service';
import { FileCleanupService } from './services/file-cleanup.service';
import { FileQuotaService } from './services/file-quota.service';
import { FileProcessingService } from './services/file-processing.service';
import { STORAGE_ADAPTER } from './storage/storage.constants';
import type { StorageAdapter } from './storage/storage-adapter.interface';
import { SupabaseStorageAdapter } from './storage/adapters/supabase.adapter';

const storageAdapterFactory = {
  provide: STORAGE_ADAPTER,
  useFactory: (configService: ConfigService): StorageAdapter => {
    const provider = configService.get<string>('STORAGE_PROVIDER', 'local');
    const logger = new Logger('StorageAdapterFactory');

    logger.log(`Initializing storage adapter: ${provider}`);

    switch (provider.toLowerCase()) {
      case 'supabase':
        return new SupabaseStorageAdapter(configService);
      case 's3':
        throw new Error(
          'S3StorageAdapter not implemented. Set STORAGE_PROVIDER=supabase',
        );
      case 'local':
        throw new Error(
          'LocalStorageAdapter not implemented. Set STORAGE_PROVIDER=supabase',
        );
      default:
        throw new Error(
          `Unknown storage provider: ${provider}. Valid: supabase`,
        );
    }
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [FilesController],
  providers: [
    FileUploadService,
    FilesService,
    FileCleanupService,
    FileQuotaService,
    FileProcessingService,
    storageAdapterFactory,
  ],
  exports: [FileUploadService, FilesService],
})
export class FilesModule {}
