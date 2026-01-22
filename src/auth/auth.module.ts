import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepository } from './repositories/user.repository';
import { JwtStrategy } from './jwt/jwt.strategy';
import { ClubsModule } from 'src/clubs/clubs.module';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        expiresIn: `${config.get('JWT_ACCESS_TTL_SECONDS')}s`,
      }),
    }),
    ClubsModule,
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],

  providers: [AuthService, UserRepository, JwtStrategy, RefreshTokenRepository],

  controllers: [AuthController],
})
export class AuthModule {}
