import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FilesService } from './files.service';

@Injectable()
export class FileQuotaService {
    private readonly logger = new Logger(FileQuotaService.name);
    private readonly maxStorageBytes: number;
    private readonly maxFileCount: number;

    constructor(
        private readonly filesService: FilesService,
        private readonly configService: ConfigService,
    ) {
        this.maxStorageBytes = this.configService.get<number>(
            'CLUB_MAX_STORAGE_BYTES',
            2 * 1024 * 1024 * 1024,
        );

        this.maxFileCount = this.configService.get<number>(
            'CLUB_MAX_FILE_COUNT',
            10000,
        );

        this.logger.log(
            `FileQuotaService: maxStorage=${this.formatBytes(this.maxStorageBytes)}, maxFiles=${this.maxFileCount}`,
        );
    }

    async checkQuota(clubId: string, fileSize: number): Promise<void> {
        const stats = await this.filesService.getClubStorageStats(clubId);

        if (stats.totalSize + fileSize > this.maxStorageBytes) {
            throw new ForbiddenException(
                `Club storage quota exceeded. Current: ${this.formatBytes(stats.totalSize)}, Limit: ${this.formatBytes(this.maxStorageBytes)}`,
            );
        }

        if (stats.totalFiles >= this.maxFileCount) {
            throw new ForbiddenException(
                `Club file count limit reached. Current: ${stats.totalFiles}, Limit: ${this.maxFileCount}`,
            );
        }

        const percentUsed = (stats.totalSize / this.maxStorageBytes) * 100;

        this.logger.debug(
            `Quota check passed for club ${clubId}: ${this.formatBytes(fileSize)} (${percentUsed.toFixed(1)}% used)`,
        );
    }

    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    }
}