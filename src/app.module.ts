import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notifications/notification.module';
import { ClubsModule } from './clubs/clubs.module';
import { ActivitiesModule } from './activities/activities.module';
import { CoreModule } from './core/core.module';
import { QrModule } from './qr/qr.module';

@Module({
  imports: [
    // GLOBAL CONFIG
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // RATE LIMIT (Required for @Throttle)
    ThrottlerModule.forRoot([
      {
        ttl: 5,
        limit: 10,
      },
    ]),

    // DATABASE
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      synchronize: false,
    }),

    // DOMAIN MODULES
    AuthModule,
    NotificationModule,
    ClubsModule,
    ActivitiesModule,
    CoreModule,

    // INFRA MODULES
    QrModule,
  ],
})
export class AppModule {}
