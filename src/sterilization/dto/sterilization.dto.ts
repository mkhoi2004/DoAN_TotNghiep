import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSterilizationCycleDto {
  @IsString()
  machineName!: string;

  @IsNumber()
  @Min(0)
  temperatureC!: number;

  @IsNumber()
  @Min(0)
  pressureBar!: number;

  @IsNumber()
  @Min(1)
  durationMinutes!: number;

  @IsString()
  operatorId!: string;
}

export class CompleteSterilizationCycleDto {
  @IsBoolean()
  passed!: boolean;
}

export class PackInstrumentDto {
  @IsString()
  packName!: string;

  @IsString()
  sterilizationCycleId!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  validDays?: number;
}

export class DeleteSterilizationCycleDto {
  @IsString()
  reason!: string;
}
