import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

import { UserRepository } from './repositories/user.repository';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';
import { MembershipStatus } from './entities/user.entity';
import { TokenResponseDto } from './dto/token-response.dto';

import { EventBus } from '../core/events/event-bus';
import { PasswordResetRequestedEvent } from './events/password-reset-requested.event';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;

  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly passwordResetTokens: PasswordResetTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly eventBus: EventBus,
  ) {
    this.accessTokenTtlSeconds = Number(
      this.config.get<string>('JWT_ACCESS_TTL_SECONDS'),
    );
    this.refreshTokenTtlDays = Number(
      this.config.get<string>('JWT_REFRESH_TTL_DAYS'),
    );
  }

  // ===================== LOGIN =====================
  async validateLogin(
    studentNo: string,
    password: string,
  ): Promise<TokenResponseDto> {
    const user = await this.users.findForLogin(studentNo);

    if (!user) {
      this.logger.warn({ studentNo }, 'Login attempt - user not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    this.assertUserActive(user);

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      this.logger.warn(
        { studentNo, userId: user.id },
        'Login attempt - invalid password',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log({ userId: user.id }, 'Login successful');
    return this.issueTokens(user.id, user.clubId);
  }

  // ===================== REFRESH =====================
  async refresh(refreshTokenPlain: string): Promise<TokenResponseDto> {
    const tokenHash = this.hash(refreshTokenPlain);

    const token = await this.refreshTokens.findByTokenHash(tokenHash);
    if (!token) {
      this.logger.warn('Token refresh attempt - invalid token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (token.expiresAt < new Date()) {
      this.logger.warn(
        { userId: token.userId },
        'Token refresh attempt - expired token',
      );
      await this.refreshTokens.deleteByUserId(token.userId);
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.users.findById(token.userId);
    this.assertUserActive(user);

    this.logger.log({ userId: user.id }, 'Token refresh successful');
    return this.issueTokens(user.id, user.clubId);
  }

  // ===================== LOGOUT =====================
  async logout(refreshTokenPlain: string): Promise<void> {
    const tokenHash = this.hash(refreshTokenPlain);
    await this.refreshTokens.deleteByTokenHash(tokenHash);
    this.logger.log({ tokenHash: tokenHash.substring(0, 8) }, 'User logged out');
  }

  // ===================== PASSWORD RESET REQUEST =====================
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);

    if (!user) {
      await new Promise((r) => setTimeout(r, 60));
      return;
    }

    const { plain, hash } = this.generateToken(32);
    const expiresAt = this.minutesFromNow(
      Number(this.config.get('AUTH_RESET_TOKEN_TTL_MINUTES')),
    );

    await this.passwordResetTokens.createToken({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    });

    this.logger.log('Password reset requested', { userId: user.id });

    this.eventBus.publish(
      new PasswordResetRequestedEvent({
        userId: user.id,
        token: plain,
      }),
    );
  }

  // ===================== PASSWORD RESET CONFIRM =====================
  async resetPassword(
    resetTokenPlain: string,
    newPassword: string,
  ): Promise<void> {
    const tokenHash = this.hash(resetTokenPlain);

    const resetToken =
      await this.passwordResetTokens.findActiveByTokenHash(tokenHash);

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const consumed = await this.passwordResetTokens.markAsUsedIfValid(
      resetToken.id,
    );

    if (!consumed) {
      throw new BadRequestException('Reset token already used');
    }

    const user = await this.users.findById(resetToken.userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.users.updatePassword(user.id, passwordHash);
    await this.users.clearForcePasswordChange(user.id);

    await this.refreshTokens.deleteByUserId(user.id);

    this.logger.log('Password reset completed', { userId: user.id });
  }

  // ===================== PRIVATE HELPERS =====================
  private assertUserActive(user: User | null): asserts user is User {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.membershipStatus !== MembershipStatus.ACTIVE) {
      throw new ForbiddenException('User inactive');
    }
  }

  private async issueTokens(
    userId: string,
    clubId: string,
  ): Promise<TokenResponseDto> {
    await this.refreshTokens.deleteByUserId(userId);

    const accessToken = this.jwt.sign({
      sub: userId,
      clubId,
    });

    const { plain, hash } = this.generateToken(64);
    const expiresAt = this.daysFromNow(this.refreshTokenTtlDays);

    await this.refreshTokens.create({
      userId,
      tokenHash: hash,
      expiresAt,
    });

    return {
      access_token: accessToken,
      expires_in: this.accessTokenTtlSeconds,
      refresh_token: plain,
    };
  }

  private generateToken(bytes: number) {
    const plain = crypto.randomBytes(bytes).toString('hex');
    return { plain, hash: this.hash(plain) };
  }

  private hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private daysFromNow(days: number) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }

  private minutesFromNow(minutes: number) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    return d;
  }
}
