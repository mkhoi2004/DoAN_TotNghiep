import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{9,}$/, {
    message: 'Password must be at least 9 characters with uppercase, lowercase, number, and special character',
  })
  password!: string;
}