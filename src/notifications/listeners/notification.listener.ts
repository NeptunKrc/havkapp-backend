import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EventBus } from '../../core/events/event-bus';
import { DomainEvent } from '../../core/events/domain-event';

import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { UserNotification } from '../entities/user-notification.entity';
import { TemplateCompiler } from '../utils/template-compiler';
import { User } from '../../auth/entities/user.entity';

interface NotifyTarget {
  levels?: string[];
}

interface NotificationEventPayload {
  clubId: string;
  createdByUserId?: string;
  relatedEntityType: string;
  relatedEntityId: string;
  notify_target?: NotifyTarget;
  [key: string]: unknown;
}

@Injectable()
export class NotificationListener {
  constructor(
    private readonly eventBus: EventBus,

    @InjectRepository(NotificationTemplate)
    private readonly templateRepo: Repository<NotificationTemplate>,

    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(UserNotification)
    private readonly userNotificationRepo: Repository<UserNotification>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
  
    this.eventBus.subscribe('ACTIVITY_CREATED', this.handle.bind(this));
    this.eventBus.subscribe('ACTIVITY_STARTED', this.handle.bind(this));
    this.eventBus.subscribe('ACTIVITY_COMPLETED', this.handle.bind(this));
    this.eventBus.subscribe('ACTIVITY_CANCELLED', this.handle.bind(this));
  }

  private async handle(event: DomainEvent<NotificationEventPayload>) {
    console.log('[NotificationListener]', event.eventName);

    const { payload } = event;

    const template = await this.templateRepo.findOne({
      where: { code: event.eventName },
    });
    if (!template) return;

    const title = TemplateCompiler.compile(template.title, payload);
    const body = TemplateCompiler.compile(template.body, payload);

    const notification = await this.notificationRepo.save(
      this.notificationRepo.create({
        template, 
        title,
        body,
        createdByUserId: payload.createdByUserId ?? null,
        relatedEntityType: payload.relatedEntityType,
        relatedEntityId: payload.relatedEntityId,
      }),
    );


    const userWhere: any = {
      clubId: payload.clubId,
      membershipStatus: 'active',
    };

    if (payload.notify_target?.levels?.length) {
      userWhere.level = payload.notify_target.levels;
    }

    const users = await this.userRepo.find({
      select: ['id'],
      where: userWhere,
    });

    if (!users.length) return;

    await this.userNotificationRepo.insert(
      users.map((u) => ({
        userId: u.id,
        notificationId: notification.id,
        deliveredAt: new Date(),
      })),
    );
  }
}
