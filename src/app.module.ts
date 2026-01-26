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
import { FilesModule } from './files/files.module';
import { AppLoggerModule } from './core/logger';

@Module({
  imports: [
    // GLOBAL CONFIG
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // LOGGING (Toggle Switch - ENV ile kontrol edilir)
    AppLoggerModule,

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
    FilesModule,

    // INFRA MODULES
    QrModule,
  ],
})
export class AppModule { }
