import { Module, Global } from '@nestjs/common';
import { EventBus } from './events/event-bus';
import { InMemoryEventBus } from './events/in-memory-event-bus';

@Global()
@Module({
  providers: [
    {
      provide: EventBus,
      useClass: InMemoryEventBus,
    },
  ],
  exports: [EventBus],
})
export class CoreModule { }
