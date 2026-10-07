import { IsEnum, IsNumber, IsString, IsUUID, Min } from 'class-validator';
import { VisitType } from '../../domain/enums';

export class CreateVisitDto {
  @IsUUID()
  patientId!: string;

  @IsUUID()
  doctorId!: string;

  @IsEnum(VisitType)
  type!: VisitType;

  @IsNumber()
  @Min(0)
  grossCharge!: number;
}