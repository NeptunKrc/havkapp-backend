import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { NotificationRepository } from './repositories/NotificationRepository';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationRepo: NotificationRepository) {}

  //Kullanıcının bildirimlerini al
  @Get()
  @ApiOperation({
    summary: 'Get my notifications',
    description: 'Returns notifications delivered to the authenticated user.',
  })
  @ApiOkResponse({ type: [NotificationResponseDto] })
  async getMyNotifications(
    @Req() req: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<NotificationResponseDto[]> {
    const userId = req.user.sub;

    return this.notificationRepo.findForUser(userId, {
      limit,
      offset,
    });
  }

  //Bildirimi okundu işaretle

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark notification as read',
  })
  async markAsRead(
    @Req() req: any,
    @Param('id') notificationId: string,
  ): Promise<void> {
    const userId = req.user.sub;

    await this.notificationRepo.markAsRead(userId, notificationId);
  }

  //Okunmamış bildirim sayı

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count',
  })
  async unreadCount(@Req() req: any): Promise<{ count: number }> {
    const userId = req.user.sub;

    const count = await this.notificationRepo.unreadCount(userId);
    return { count };
  }
}
