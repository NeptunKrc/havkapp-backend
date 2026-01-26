import { Module, Global } from '@nestjs/common';
import { EventBus } from './events/event-bus';
import { InMemoryEventBus } from './events/in-memory-event-bus';
import { CACHE_SERVICE, SimpleCacheService } from './cache';

@Global()
@Module({
  providers: [
    {
      provide: EventBus,
      useClass: InMemoryEventBus,
    },
    {
      provide: CACHE_SERVICE,
      useClass: SimpleCacheService,
    },
  ],
  exports: [EventBus, CACHE_SERVICE],
})
export class CoreModule { }
