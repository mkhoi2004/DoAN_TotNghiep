import { IsString, MinLength } from 'class-validator';

export class SettleEmrDto {
  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}