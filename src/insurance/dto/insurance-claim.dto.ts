import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateInsuranceClaimDto {
  @IsString()
  visitId!: string;

  @IsString()
  patientId!: string;

  @IsString()
  payerName!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  coveragePercentage?: number;
}

export class ApproveInsuranceClaimDto {
  @IsNumber()
  @Min(0)
  approvedAmount!: number;

  @IsNumber()
  @Min(0)
  patientAmount!: number;
}

export class DeleteInsuranceClaimDto {
  @IsString()
  reason!: string;
}
