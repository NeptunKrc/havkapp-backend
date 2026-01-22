import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ValidateQrDto {
  @ApiProperty({
    format: 'uuid',
    description: 'QR unique identifier',
  })
  @IsUUID()
  qrId: string;
}
