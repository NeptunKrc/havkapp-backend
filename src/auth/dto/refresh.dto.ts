import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @MinLength(64) // refresh token hex length safety
  refreshToken: string;
}
