import { NotificationResponseDto } from '../dto/notification-response.dto';

export interface INotificationRepository {
  findForUser(
    userId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<NotificationResponseDto[]>;

  markAsRead(userId: string, notificationId: string): Promise<void>;

  unreadCount(userId: string): Promise<number>;
}
