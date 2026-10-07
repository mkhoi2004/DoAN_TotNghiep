import { IsNumber, IsString, Min } from 'class-validator';

export class CreateWarrantyDto {
  @IsString()
  patientId!: string;

  @IsString()
  visitId!: string;

  @IsString()
  serviceCode!: string;

  @IsNumber()
  @Min(1)
  durationMonths!: number;
}

export class DeleteWarrantyDto {
  @IsString()
  reason!: string;
}
