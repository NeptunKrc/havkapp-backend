import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { activity_status_enum } from './entities/activity.enums';

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
  ) {}

  // -------- CREATE --------
  @Post()
  @ApiOperation({
    summary: 'Create a new activity',
    description: 'Creates an activity in upcoming state for the user’s club.',
  })
  async create(
    @Body() dto: CreateActivityDto,
    @Req() req: any,
  ) {
    return this.activitiesService.create({
      dto,
      userId: req.user.sub,
      clubId: req.user.clubId,
    });
  }

  // -------- LIST --------
  @Get()
  @ApiOperation({
    summary: 'List activities',
    description: 'Lists activities for the current user club with pagination.',
  })
  @ApiQuery({ name: 'status', enum: activity_status_enum, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
    async list(
        @Req() req: any,
        @Query('status') status?: activity_status_enum,
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 20,
    ) {
        return this.activitiesService.list({
        clubId: req.user.clubId,
        status,
        page,
        limit,
     });
}


  // -------- DETAIL --------
  @Get(':id')
  @ApiOperation({
    summary: 'Get activity detail',
    description: 'Returns activity detail if it belongs to user club.',
  })
  async detail(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const activity = await this.activitiesService.findOne({
      id,
      clubId: req.user.clubId,
    });

    if (!activity) {
      throw new NotFoundException('Activity not found');
    }

    return activity;
  }

  // -------- START --------
  @Patch(':id/start')
  @ApiOperation({
    summary: 'Start activity',
    description: 'Transitions activity from upcoming to ongoing.',
  })
  async start(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.start({
      id,
      userId: req.user.sub,
      clubId: req.user.clubId,
    });
  }

  // -------- COMPLETE --------
  @Patch(':id/complete')
  @ApiOperation({
    summary: 'Complete activity',
    description: 'Transitions activity from ongoing to completed.',
  })
  async complete(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.complete({
      id,
      userId: req.user.sub,
      clubId: req.user.clubId,
    });
  }

  // -------- CANCEL --------
  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel activity',
    description: 'Transitions activity from upcoming to cancelled.',
  })
  async cancel(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.activitiesService.cancel({
      id,
      userId: req.user.sub,
      clubId: req.user.clubId,
    });
  }
}
