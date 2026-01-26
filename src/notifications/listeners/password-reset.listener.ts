import { Injectable, Logger } from '@nestjs/common';
import { EventBus } from '../../core/events/event-bus';
import { PasswordResetRequestedEvent } from '../../auth/events/password-reset-requested.event';

@Injectable()
export class PasswordResetListener {
  private readonly logger = new Logger(PasswordResetListener.name);

  constructor(private readonly eventBus: EventBus) {
    this.eventBus.subscribe('PASSWORD_RESET_REQUESTED', this.handle.bind(this));
  }

  async handle(event: PasswordResetRequestedEvent): Promise<void> {
    const { userId, token } = event.payload;

    // ŞİMDİLİK SADECE LOG mail sistemi hazır olana kadar
    this.logger.log('Password reset event received', {
      userId,
      token,
    });
  }
}
