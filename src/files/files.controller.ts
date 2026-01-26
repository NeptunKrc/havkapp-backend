import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Headers,
  UploadedFile,
  UseInterceptors,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StreamableFile } from '@nestjs/common';
import { Readable } from 'stream';
import type { Response } from 'express';

import { FileUploadService } from './services/file-upload.service';
import { FilesService } from './services/files.service';

interface UploadedFileDto {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

@Controller('files')
export class FilesController {
  constructor(
    private readonly uploadService: FileUploadService,
    private readonly filesService: FilesService,
  ) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: Number(
              process.env.FILE_UPLOAD_MAX_SIZE ?? 50 * 1024 * 1024,
            ),
          }),
        ],
      }),
    )
    file: UploadedFileDto,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!clubId) {
      throw new BadRequestException('x-club-id header is required');
    }

    return this.uploadService.upload({
      clubId,
      stream: Readable.from(file.buffer),
      originalName: file.originalname,
      declaredMimeType: file.mimetype,
      size: file.size,
    });
  }

  @Get(':id')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @Res({ passthrough: true }) res: Response,
    @Query('redirect') redirect?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!clubId) {
      throw new BadRequestException('x-club-id header is required');
    }

    const result = await this.filesService.read({
      fileId: id,
      clubId,
      canRead: true,
      preferRedirect: redirect === 'true',
    });

    if (result.mode === 'redirect') {
      res.redirect(307, result.redirectUrl);
      return;
    }

    res.set({
      'Content-Type': result.mimeType,
      'Content-Length': result.size.toString(),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });

    return new StreamableFile(result.stream);
  }

  @Get('health/check')
  @HttpCode(HttpStatus.OK)
  healthCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'files',
    };
  }
}
