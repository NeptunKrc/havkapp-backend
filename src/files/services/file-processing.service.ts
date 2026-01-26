import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

export enum ImageProcessingType {
  AVATAR = 'avatar',
  COVER = 'cover',
  THUMBNAIL = 'thumbnail',
  ORIGINAL = 'original',
}

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

@Injectable()
export class FileProcessingService {
  private readonly logger = new Logger(FileProcessingService.name);
  private readonly enableProcessing: boolean;

  private readonly dimensions = {
    [ImageProcessingType.AVATAR]: { width: 400, height: 400 },
    [ImageProcessingType.COVER]: { width: 1200, height: 600 },
    [ImageProcessingType.THUMBNAIL]: { width: 200, height: 200 },
  };

  constructor(private readonly configService: ConfigService) {
    this.enableProcessing = this.configService.get<boolean>(
      'ENABLE_IMAGE_PROCESSING',
      false,
    );

    this.logger.log(
      `FileProcessingService: processing=${this.enableProcessing}`,
    );
  }

  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async processImage(
    buffer: Buffer,
    type: ImageProcessingType = ImageProcessingType.ORIGINAL,
  ): Promise<ProcessedImage> {
    if (!this.enableProcessing || type === ImageProcessingType.ORIGINAL) {
      const metadata = await sharp(buffer).metadata();
      return {
        buffer,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
      };
    }

    try {
      let pipeline = sharp(buffer);
      const metadata = await pipeline.metadata();

      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image format');
      }

      const dimensions = this.dimensions[type];

      pipeline = pipeline.resize(dimensions.width, dimensions.height, {
        fit: type === ImageProcessingType.COVER ? 'cover' : 'inside',
        withoutEnlargement: true,
      });

      pipeline = pipeline.webp({ quality: 85, effort: 4 });

      const processedBuffer = await pipeline.toBuffer();
      const processedMetadata = await sharp(processedBuffer).metadata();

      this.logger.debug(
        `Image processed (${type}): ${metadata.width}x${metadata.height} → ${processedMetadata.width}x${processedMetadata.height}`,
      );

      return {
        buffer: processedBuffer,
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format,
        size: processedBuffer.length,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Image processing failed', error);
      throw new InternalServerErrorException('Image processing failed');
    }
  }

  async getImageMetadata(buffer: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const metadata = await sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
      };
    } catch (error) {
      throw new BadRequestException('Invalid image format');
    }
  }
}
