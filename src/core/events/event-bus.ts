import { DomainEvent } from './domain-event';

export abstract class EventBus {
  abstract publish(event: DomainEvent): void;

  abstract subscribe<T extends DomainEvent = DomainEvent>(
    eventName: string,
    handler: (event: T) => void | Promise<void>,
  ): void;
}
