import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

export class CreateQrDto {
  @ApiProperty({
    example: 'activity_participation_mandatory',
    description: 'Whitelisted QR type',
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Target domain entity ID',
  })
  @IsUUID()
  targetId: string;
}
