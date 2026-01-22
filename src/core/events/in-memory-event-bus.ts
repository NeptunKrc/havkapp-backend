import { DomainEvent } from './domain-event';
import { EventBus } from './event-bus';

type EventHandler<T extends DomainEvent = DomainEvent> = (
  event: T,
) => void | Promise<void>;

export class InMemoryEventBus extends EventBus {
  private readonly handlers = new Map<string, EventHandler[]>();

  publish(event: DomainEvent): void {
    const eventHandlers = this.handlers.get(event.eventName);
    if (!eventHandlers || eventHandlers.length === 0) {
      return;
    }

    for (const handler of eventHandlers) {
      Promise.resolve(handler(event)).catch((err) => {
        // ❗ Event handler hatası sistemi ÇÖKERTMEMELİ
        console.error(
          `[EventBus] Error while handling event "${event.eventName}"`,
          err,
        );
      });
    }
  }

  subscribe<T extends DomainEvent = DomainEvent>(
    eventName: string,
    handler: EventHandler<T>,
  ): void {
    const existing = this.handlers.get(eventName) ?? [];
    this.handlers.set(eventName, [...existing, handler as EventHandler]);
  }
}
