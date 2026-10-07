import { IsBoolean, IsNumber, IsString, Min } from 'class-validator';

export class AddTreatmentLineDto {
  @IsString()
  serviceCode!: string;

  @IsString()
  serviceName!: string;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsBoolean()
  requiresConsent!: boolean;
}