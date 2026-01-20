import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Yeni faaliyet' })
  title: string;

  @ApiProperty({ example: 'Yamaç Paraşütü faaliyeti oluşturuldu' })
  body: string;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-01-20T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: 'activity' })
  relatedEntityType: string;

  @ApiProperty({ example: 'uuid' })
  relatedEntityId: string;
}
