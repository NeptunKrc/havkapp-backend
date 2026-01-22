import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { QrCodeEntity } from '../entities/qr-code.entity';

@Injectable()
export class QrRepository {
  constructor(private readonly dataSource: DataSource) {}

  private getRepository(manager?: EntityManager): Repository<QrCodeEntity> {
    return (manager ?? this.dataSource.manager).getRepository(QrCodeEntity);
  }

  async createQr(
    data: {
      type: string;
      targetId: string;
      clubId: string;
      createdByUserId?: string | null;
    },
    manager?: EntityManager,
  ): Promise<QrCodeEntity> {
    const repo = this.getRepository(manager);

    const qr = repo.create({
      type: data.type,
      targetId: data.targetId,
      clubId: data.clubId,
      createdByUserId: data.createdByUserId ?? null,
    });

    return repo.save(qr);
  }

  async findById(
    qrId: string,
    manager?: EntityManager,
  ): Promise<QrCodeEntity | null> {
    return this.getRepository(manager).findOne({
      where: { id: qrId },
    });
  }

  async findByTypeAndTarget(
    type: string,
    targetId: string,
    manager?: EntityManager,
  ): Promise<QrCodeEntity | null> {
    return this.getRepository(manager).findOne({
      where: { type, targetId },
    });
  }

  async revoke(qrId: string, manager?: EntityManager): Promise<void> {
    await this.getRepository(manager).update(
      { id: qrId },
      { status: 'revoked' },
    );
  }
}
