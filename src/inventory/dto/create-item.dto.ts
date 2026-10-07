import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  itemCode!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  unit!: string;

  @IsOptional()
  @IsBoolean()
  requiresLot?: boolean;
}