import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationController } from './notification.controller';
import { NotificationRepository } from './repositories/NotificationRepository';
import { NotificationListener } from './listeners/notification.listener';
import { PasswordResetListener } from './listeners/password-reset.listener';
import { Notification } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { UserNotification } from './entities/user-notification.entity';
import { User } from '../auth/entities/user.entity';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationTemplate,
      UserNotification,
      User,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationListener, // 🔥 EVENT LISTENER (ŞART)
    PasswordResetListener,
    {
      provide: NotificationRepository,
      useFactory: (dataSource: DataSource) =>
        new NotificationRepository(dataSource),
      inject: [DataSource],
    },
  ],
})
export class NotificationModule {}
