import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import { QrRepository } from '../repositories/qr.repository';
import { QrCodeEntity } from '../entities/qr-code.entity';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);
  private readonly allowedTypes: string[];

  constructor(
    private readonly qrRepository: QrRepository,
    private readonly configService: ConfigService,
  ) {
    this.allowedTypes =
      this.configService.get<string[]>('ALLOWED_QR_TYPES') ?? [];
  }

  //Create QR Same input same output
  async createQr(
    params: {
      type: string;
      targetId: string;
      clubId: string;
      createdByUserId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<{ qrId: string }> {
    this.assertTypeAllowed(params.type);

    try {
      const qr = await this.qrRepository.createQr(
        {
          type: params.type,
          targetId: params.targetId,
          clubId: params.clubId,
          createdByUserId: params.createdByUserId,
        },
        manager,
      );

      return { qrId: qr.id };
    } catch (error: any) {
      // Postgres unique constraint violation
      if (error?.code === '23505') {
        const existing = await this.qrRepository.findByTypeAndTarget(
          params.type,
          params.targetId,
          manager,
        );

        if (existing) {
          return { qrId: existing.id };
        }

        this.logger.error('Unique constraint hit but QR not found', error);
        throw new ConflictException('QR already exists');
      }

      throw error;
    }
  }

  //just vaildates QR, CLUB maybe removed later
  async validateQr(
    qrId: string,
    clubId: string,
    manager?: EntityManager,
  ): Promise<Pick<QrCodeEntity, 'type' | 'targetId'>> {
    const qr = await this.qrRepository.findById(qrId, manager);

    if (!qr) {
      this.logger.warn(`QR not found: ${qrId}`);
      throw new NotFoundException('QR not found');
    }

    if (qr.status !== 'active') {
      this.logger.warn(`QR revoked: ${qrId}`);
      throw new BadRequestException('QR is not active');
    }

    if (qr.clubId !== clubId) {
      this.logger.warn(`QR club mismatch: qr=${qr.clubId}, req=${clubId}`);
      throw new ForbiddenException('QR does not belong to this club');
    }

    return {
      type: qr.type,
      targetId: qr.targetId,
    };
  }

  //revoke QR
  async revokeQr(
    qrId: string,
    revokedByUserId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const qr = await this.qrRepository.findById(qrId, manager);

    if (!qr) {
      throw new NotFoundException('QR not found');
    }

    if (qr.status === 'revoked') {
      return; // idempotent
    }

    await this.qrRepository.revoke(qrId, manager);

    this.logger.warn(`QR revoked: qrId=${qrId} by user=${revokedByUserId}`);
  }

  //Interal type check
  private assertTypeAllowed(type: string): void {
    if (!this.allowedTypes.includes(type)) {
      this.logger.warn(`QR type not allowed: ${type}`);
      throw new BadRequestException('QR type is not allowed');
    }
  }
}
