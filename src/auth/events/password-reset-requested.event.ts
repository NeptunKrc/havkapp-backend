import { DomainEvent } from '../../core/events/domain-event';

export interface PasswordResetRequestedPayload {
  userId: string;
  token: string;
}

export class PasswordResetRequestedEvent implements DomainEvent<PasswordResetRequestedPayload> {
  readonly eventName = 'PASSWORD_RESET_REQUESTED';
  readonly occurredAt = new Date();

  constructor(public readonly payload: PasswordResetRequestedPayload) {}
}
