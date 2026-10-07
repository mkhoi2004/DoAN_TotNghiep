import { IsOptional, IsString } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  allergies?: string;
}

export class DeletePatientDto {
  @IsString()
  reason!: string;
}
