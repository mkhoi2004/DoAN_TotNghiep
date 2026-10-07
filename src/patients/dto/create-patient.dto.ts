import { IsDateString, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsString()
  gender!: string;

  @Matches(/^0\d{9}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  allergies?: string;
}