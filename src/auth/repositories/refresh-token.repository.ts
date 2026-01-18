import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { LessThan } from 'typeorm';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  create(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {

    const token = this.repo.create(data);
    return this.repo.save(token);
  }
  findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }
  async deleteExpired(now: Date): Promise<void> {
    await this.repo.delete({ expiresAt: LessThan(now) });
  }
  async deleteByTokenHash(tokenHash: string): Promise<void> {
  await this.repo.delete({ tokenHash });
}

  
}