import { IsString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsString()
  visitId!: string;

  @IsString()
  patientId!: string;
}

export class CreateLabOrderDto {
  @IsString()
  visitId!: string;

  @IsString()
  patientId!: string;

  @IsString()
  testName!: string;
}

export class DeleteClinicalOrderDto {
  @IsString()
  reason!: string;
}
