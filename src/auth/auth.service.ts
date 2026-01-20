import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { MembershipStatus } from './entities/user.entity';

@Injectable()
export class AuthService {
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;

  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.accessTokenTtlSeconds = Number(
      this.config.get<string>('JWT_ACCESS_TTL_SECONDS'),
    );

    this.refreshTokenTtlDays = Number(
      this.config.get<string>('JWT_REFRESH_TTL_DAYS'),
    );
  }

  // login

  async validateLogin(studentNo: string, password: string) {
    const user = await this.users.findForLogin(studentNo);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.membershipStatus !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('User inactive');
    }

    await this.refreshTokens.deleteByUserId(user.id);

    const accessToken = this.jwt.sign({
      sub: user.id,
      clubId: user.clubId,
    });

    const refreshPlain = crypto.randomBytes(64).toString('hex');
    const refreshHash = crypto
      .createHash('sha256')
      .update(refreshPlain)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenTtlDays);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt,
    });

    return {
      access_token: accessToken,
      expires_in: this.accessTokenTtlSeconds,
      refresh_token: refreshPlain,
    };
  }

  //refresh
  async refresh(refreshTokenPlain: string) {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');

    const token = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!token) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.expiresAt < new Date()) {
      await this.refreshTokens.deleteByUserId(token.userId);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findById(token.userId);
    if (!user || user.membershipStatus !== MembershipStatus.ACTIVE) {
      await this.refreshTokens.deleteByUserId(token.userId);
      throw new ForbiddenException('User inactive');
    }

    await this.refreshTokens.deleteByUserId(user.id);

    const accessToken = this.jwt.sign({
      sub: user.id,
      clubId: user.clubId,
    });

    const newRefreshPlain = crypto.randomBytes(64).toString('hex');
    const newRefreshHash = crypto
      .createHash('sha256')
      .update(newRefreshPlain)
      .digest('hex');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshTokenTtlDays);

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: newRefreshHash,
      expiresAt,
    });

    return {
      access_token: accessToken,
      expires_in: this.accessTokenTtlSeconds,
      refresh_token: newRefreshPlain,
    };
  }

  // logout

  async logout(refreshTokenPlain: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshTokenPlain)
      .digest('hex');

    await this.refreshTokens.deleteByTokenHash(tokenHash);
  }
}
