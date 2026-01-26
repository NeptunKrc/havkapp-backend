import { IsString, MinLength, Length /*, Matches */ } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(64) //hex length sefety
  token: string;

  @IsString()
  @Length(8, 100)

  //Pass policy'e göre sonra düzenlenecek

  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
  //   message:
  //     'Password must contain at least one uppercase, lowercase, and number',
  // })
  newPassword: string;
}
