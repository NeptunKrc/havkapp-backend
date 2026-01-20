import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notifications/notification.module';
import { ClubsModule } from './clubs/clubs.module';
import { ActivitiesModule } from './activities/activities.module';
import { CoreModule } from './core/core.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      autoLoadEntities: true,
      synchronize: false,
    }),
    AuthModule,
    NotificationModule,
    ClubsModule,
    ActivitiesModule,
    CoreModule,

  ],
})
export class AppModule { }
