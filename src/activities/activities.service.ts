import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { DataSource } from 'typeorm';

import { Activity } from './entities/activity.entity';
import { ActivityCategory } from './entities/activity-category.entity';
import { ActivityResponsibilityCode } from './entities/activity-responsibility-code.entity';
import { responsibility_code_type_enum } from './entities/responsibility-code.enums';
import { generateResponsibilityCode } from './utils/responsibility-code.generator';

import { Location } from './entities/location.entity';

import { CreateActivityDto } from './dto/create-activity.dto';
import { activity_status_enum } from './entities/activity.enums';

import { EventBus } from '../core/events/event-bus';
import { DomainEvent } from '../core/events/domain-event';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepo: Repository<Activity>,

    @InjectRepository(ActivityCategory)
    private readonly categoryRepo: Repository<ActivityCategory>,

    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,

    private readonly eventBus: EventBus,

    private readonly dataSource: DataSource,
  ) {}

  // ---------------- CREATE ----------------
  async create(params: {
    dto: CreateActivityDto;
    userId: string;
    clubId: string;
  }) {
    const { dto, userId, clubId } = params;

    const categoryExists = await this.categoryRepo.exist({
      where: { id: dto.activity_category_id, club_id: clubId },
    });
    if (!categoryExists) {
      throw new BadRequestException(
        'Activity category not found for this club',
      );
    }

    const locationExists = await this.locationRepo.exist({
      where: { id: dto.location_id, club_id: clubId },
    });
    if (!locationExists) {
      throw new BadRequestException('Location not found for this club');
    }

    const activity = this.activityRepo.create({
      name: dto.name,
      obligation_type: dto.obligation_type,
      status: activity_status_enum.upcoming,
      activity_category_id: dto.activity_category_id,
      activity_date: dto.activity_date,
      location_id: dto.location_id,
      gathering_time: dto.gathering_time,
      departure_time: dto.departure_time,
      is_transport_required: dto.is_transport_required,
      description: dto.description ?? null,
      created_by_user_id: userId,
      club_id: clubId,
    });

    const saved = await this.activityRepo.save(activity);

    const event: DomainEvent = {
      eventName: 'ACTIVITY_CREATED',
      occurredAt: new Date(),
      payload: {
        clubId,
        createdByUserId: userId,
        relatedEntityType: 'activity',
        relatedEntityId: saved.id,
        activity_name: saved.name,
        activity_date: saved.activity_date,
      },
    };

    this.eventBus.publish(event);
    return saved;
  }

  // ---------------- LIST ----------------
  async list(params: {
    clubId: string;
    status?: activity_status_enum;
    page: number;
    limit: number;
  }) {
    const { clubId, status, page, limit } = params;

    const where: FindOptionsWhere<Activity> = {
      club_id: clubId,
      ...(status ? { status } : {}),
    };

    const [items, total] = await this.activityRepo.findAndCount({
      where,
      order: { activity_date: 'DESC', created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ---------------- DETAIL ----------------
  async findOne(params: { id: string; clubId: string }) {
    const { id, clubId } = params;

    return this.activityRepo.findOne({
      where: {
        id,
        club_id: clubId,
      },
    });
  }
  // ---------------- START (FINAL) ----------------
  async start(params: { id: string; userId: string; clubId: string }) {
    const { id, userId, clubId } = params;

    return this.dataSource.transaction(async (manager) => {
      const activity = await manager.findOne(Activity, {
        where: {
          id,
          club_id: clubId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      if (activity.status !== activity_status_enum.upcoming) {
        throw new BadRequestException(
          'Only upcoming activities can be started',
        );
      }

      //(bilinçli TZ varsayımı)
      const now = new Date();
      const gatheringDateTime = new Date(
        `${activity.activity_date}T${activity.gathering_time}`,
      );

      const EARLY_START_LIMIT_MINUTES = 60;
      const diffMinutes =
        (gatheringDateTime.getTime() - now.getTime()) / (1000 * 60);

      if (diffMinutes > EARLY_START_LIMIT_MINUTES) {
        throw new BadRequestException('Activity cannot be started yet');
      }

      activity.status = activity_status_enum.ongoing;
      await manager.save(Activity, activity);

      const createCode = async (type: responsibility_code_type_enum) => {
        const MAX_RETRY = 5;

        for (let attempt = 0; attempt < MAX_RETRY; attempt++) {
          try {
            const code = generateResponsibilityCode();

            const entity = manager.create(ActivityResponsibilityCode, {
              activity_id: activity.id,
              code,
              type,
            });

            return await manager.save(ActivityResponsibilityCode, entity);
          } catch (err: any) {
            // Unique constraint ihlali → retry
            if (err.code === '23505') {
              continue;
            }
            throw err;
          }
        }

        throw new BadRequestException(
          'Failed to generate unique responsibility code',
        );
      };

      //SK Kodları oluşturma
      await createCode(responsibility_code_type_enum.full);
      await createCode(responsibility_code_type_enum.material);

      const event: DomainEvent = {
        eventName: 'ACTIVITY_STARTED',
        occurredAt: new Date(),
        payload: {
          clubId,
          createdByUserId: userId,
          relatedEntityType: 'activity',
          relatedEntityId: activity.id,
          activity_name: activity.name,
        },
      };

      this.eventBus.publish(event);

      return activity;
    });
  }
  // ---------------- COMPLETE ----------------
  async complete(params: { id: string; userId: string; clubId: string }) {
    const { id, userId, clubId } = params;

    return this.dataSource.transaction(async (manager) => {
      const activity = await manager.findOne(Activity, {
        where: {
          id,
          club_id: clubId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      if (activity.status !== activity_status_enum.ongoing) {
        throw new BadRequestException(
          'Only ongoing activities can be completed',
        );
      }

      activity.status = activity_status_enum.completed;
      await manager.save(Activity, activity);

      // SK CELEANUP
      await manager.delete(ActivityResponsibilityCode, {
        activity_id: activity.id,
      });

      // EVENT PUBLISHi
      const event: DomainEvent = {
        eventName: 'ACTIVITY_COMPLETED',
        occurredAt: new Date(),
        payload: {
          clubId,
          completedByUserId: userId,
          relatedEntityType: 'activity',
          relatedEntityId: activity.id,
          activity_name: activity.name,
        },
      };

      this.eventBus.publish(event);

      return activity;
    });
  }
  // ---------------- CANCEL ----------------
  async cancel(params: { id: string; userId: string; clubId: string }) {
    const { id, userId, clubId } = params;

    return this.dataSource.transaction(async (manager) => {
      const activity = await manager.findOne(Activity, {
        where: {
          id,
          club_id: clubId,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activity) {
        throw new NotFoundException('Activity not found');
      }

      if (activity.status !== activity_status_enum.upcoming) {
        throw new BadRequestException(
          'Only upcoming activities can be cancelled',
        );
      }

      activity.status = activity_status_enum.cancelled;
      await manager.save(Activity, activity);

      await manager.delete(ActivityResponsibilityCode, {
        activity_id: activity.id,
      });

      // Event burda yayınlanıyor
      const event: DomainEvent = {
        eventName: 'ACTIVITY_CANCELLED',
        occurredAt: new Date(),
        payload: {
          clubId,
          cancelledByUserId: userId,
          relatedEntityType: 'activity',
          relatedEntityId: activity.id,
          activity_name: activity.name,
        },
      };

      this.eventBus.publish(event);

      return activity;
    });
  }
}
