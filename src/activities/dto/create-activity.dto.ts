import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import {
  obligation_type_enum,
  activity_status_enum,
} from '../entities/activity.enums';

const TIME_24H_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/; //time formatı hesaplamada sıkıntı çıkmasın diye

export class CreateActivityDto {
  @ApiProperty({ example: 'Yamaç Paraşütü Eğitimi' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: obligation_type_enum })
  @IsEnum(obligation_type_enum)
  obligation_type: obligation_type_enum;

  @ApiProperty({
    enum: activity_status_enum,
    required: false,
    example: activity_status_enum.upcoming,
  })
  @IsOptional()
  @IsEnum(activity_status_enum)
  status?: activity_status_enum;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  activity_category_id: string;

  @ApiProperty({ example: '2026-02-15' })
  @IsDateString()
  activity_date: string;

  @ApiProperty({ example: '660e8400-e29b-41d4-a716-446655440999' })
  @IsUUID()
  location_id: string;

  @ApiProperty({ example: '09:30', description: 'HH:mm (24h format)' })
  @IsString()
  @Matches(TIME_24H_REGEX, {
    message: 'gathering_time must be in HH:mm (24h) format',
  })
  gathering_time: string;

  @ApiProperty({ example: '10:00', description: 'HH:mm (24h format)' })
  @IsString()
  @Matches(TIME_24H_REGEX, {
    message: 'departure_time must be in HH:mm (24h) format',
  })
  departure_time: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  is_transport_required: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
