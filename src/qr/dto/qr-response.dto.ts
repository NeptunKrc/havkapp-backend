import { ApiProperty } from '@nestjs/swagger';

export class QrIdResponseDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Generated or existing QR identifier',
  })
  qrId: string;
}

export class QrValidateResponseDto {
  @ApiProperty({
    description: 'QR usage type',
    example: 'activity_participation_mandatory',
  })
  type: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Target domain entity ID',
  })
  targetId: string;
}
