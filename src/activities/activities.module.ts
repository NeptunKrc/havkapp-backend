import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';

import { Activity } from './entities/activity.entity';
import { ActivityCategory } from './entities/activity-category.entity';
import { Location } from './entities/location.entity';
import { ActivityResponsibilityCode } from './entities/activity-responsibility-code.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityCategory,
      Location,
      ActivityResponsibilityCode,
    ]),
  ],
  controllers: [ActivitiesController],
  providers: [
    ActivitiesService,
  ],
  exports: [ActivitiesService],
})
export class ActivitiesModule { }
