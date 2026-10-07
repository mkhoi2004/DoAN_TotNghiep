import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { LabReworkResponsibility } from '../../domain/enums';

export class CreateDentalLabTicketDto {
  @IsString()
  visitId!: string;

  @IsString()
  patientId!: string;

  @IsString()
  labName!: string;

  @IsString()
  restorationType!: string;

  @IsOptional()
  @IsString()
  sentAt?: string;

  @IsOptional()
  @IsString()
  dueAt?: string;
}

export class CreateLabReworkCycleDto {
  @IsString()
  labTicketId!: string;

  @IsString()
  reason!: string;

  @IsEnum(LabReworkResponsibility)
  responsibility!: LabReworkResponsibility;

  @IsNumber()
  @Min(0)
  charge!: number;
}

export class DeleteDentalLabTicketDto {
  @IsString()
  reason!: string;
}
