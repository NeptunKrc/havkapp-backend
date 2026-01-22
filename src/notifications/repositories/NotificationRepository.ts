import { DataSource } from 'typeorm';
import { INotificationRepository } from './INotificationRepository';
import { NotificationResponseDto } from '../dto/notification-response.dto';
import { UserNotification } from '../entities/user-notification.entity';
import { Notification } from '../entities/notification.entity';

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findForUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<NotificationResponseDto[]> {
    const qb = this.dataSource
      .getRepository(UserNotification)
      .createQueryBuilder('un')
      .innerJoin(Notification, 'n', 'n.id = un.notification_id')
      .select([
        'n.id AS id',
        'n.title AS title',
        'n.body AS body',
        'un.is_read AS "isRead"',
        'n.created_at AS "createdAt"',
        'n.related_entity_type AS "relatedEntityType"',
        'n.related_entity_id AS "relatedEntityId"',
      ])
      .where('un.user_id = :userId', { userId })
      .orderBy('n.created_at', 'DESC');

    if (options?.limit) qb.limit(options.limit);
    if (options?.offset) qb.offset(options.offset);

    return qb.getRawMany<NotificationResponseDto>();
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    await this.dataSource
      .getRepository(UserNotification)
      .update({ userId, notificationId }, { isRead: true });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.dataSource.getRepository(UserNotification).count({
      where: { userId, isRead: false },
    });
  }
}
