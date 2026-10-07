import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';
import { PaymentMethod } from '../../domain/enums';

export class RecordPaymentDto {
  @IsUUID()
  visitId!: string;

  @IsUUID()
  createdById!: string;

  @IsUUID()
  @IsOptional()
  cashShiftId?: string;

  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}