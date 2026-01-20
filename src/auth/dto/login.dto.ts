import { IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(3, 20)
  studentNo: string;

  @IsString()
  @Length(6, 100)
  password: string;
}
