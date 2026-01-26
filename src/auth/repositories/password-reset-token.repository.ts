import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull } from 'typeorm';
import { PasswordResetToken } from '../entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
  ) {}

  async createToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetToken> {
    // Ensure only one active token per user
    await this.invalidateByUserId(data.userId);

    const token = this.repo.create(data);
    return this.repo.save(token);
  }

  async findActiveByTokenHash(
    tokenHash: string,
    now: Date = new Date(),
  ): Promise<PasswordResetToken | null> {
    return this.repo.findOne({
      where: {
        tokenHash,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
    });
  }

  async markAsUsedIfValid(id: string): Promise<boolean> {
    const result = await this.repo.update(
      { id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    return result.affected === 1;
  }

  async invalidateByUserId(
    userId: string,
    now: Date = new Date(),
  ): Promise<void> {
    await this.repo.update(
      {
        userId,
        usedAt: IsNull(),
        expiresAt: MoreThan(now),
      },
      { usedAt: new Date() },
    );
  }

  async cleanupExpiredTokens(now: Date): Promise<void> {
    await this.repo.delete({
      expiresAt: LessThan(now),
    });
  }
}
