import { IsNumber, IsUUID, Min } from 'class-validator';

export class ReserveStockDto {
  @IsUUID()
  visitId!: string;

  @IsUUID()
  itemId!: string;

  @IsNumber()
  @Min(0.001)
  quantity!: number;
}