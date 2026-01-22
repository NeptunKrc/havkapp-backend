import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

import { QrService } from './services/qr.service';
import { CreateQrDto } from './dto/create-qr.dto';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { QrImageGenerator } from './utils/qr-image.generator';
import { Header } from '@nestjs/common';

import { QrIdResponseDto, QrValidateResponseDto } from './dto/qr-response.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';


// Local request typing to satisfy TypeScript.

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    clubId: string;
  };
}

@ApiTags('QR')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Unauthorized' })
@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  // --------------------
  // CREATE
  // --------------------
  @Post()
  @ApiOperation({ summary: 'Create a new QR' })
  @ApiResponse({ status: 201, type: QrIdResponseDto })
  async create(
    @Body() dto: CreateQrDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<QrIdResponseDto> {
    const user = req.user;

    return this.qrService.createQr({
      type: dto.type,
      targetId: dto.targetId,
      clubId: user.clubId,
      createdByUserId: user.sub,
    });
  }


// Validate (SCAN)

  @Post('validate')
  @Throttle({ default: { limit: 10, ttl: 5 } })
  @ApiOperation({ summary: 'Validate (scan) a QR' })
  @ApiResponse({ status: 200, type: QrValidateResponseDto })
  async validate(
    @Body() dto: ValidateQrDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<QrValidateResponseDto> {
    const user = req.user;

    return this.qrService.validateQr(dto.qrId, user.clubId);
  }

  // --------------------
  // REVOKE
  // --------------------
  @Post(':qrId/revoke')
  @ApiOperation({ summary: 'Revoke a QR permanently' })
  @ApiResponse({ status: 204 })
  async revoke(
    @Param('qrId') qrId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const user = req.user;

    await this.qrService.revokeQr(qrId, user.sub);
  }

  //Just for debug, get QR metadata
  @Get(':qrId')
  @ApiOperation({ summary: 'Get QR metadata (debug)' })
  async getMeta(@Param('qrId') qrId: string) {
    return { qrId };
  }

  // IMAGE
  @Get(':qrId/image')
  @Header('Content-Type', 'image/svg+xml')
  @ApiOperation({ summary: 'Get QR image (svg or png)' })
  async getImage(
    @Param('qrId') qrId: string,
    @Query('format') format: 'svg' | 'png' = 'svg',
    @Req() req: AuthenticatedRequest,
  ) {
    await this.qrService.validateQr(qrId, req.user.clubId);

    const image = await QrImageGenerator.generate(qrId, format);

    return image;
  }
}
