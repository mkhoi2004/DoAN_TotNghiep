import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ReceiveLotDto {
  @IsUUID()
  itemId!: string;

  @IsString()
  lotCode!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitCost!: number;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;
}