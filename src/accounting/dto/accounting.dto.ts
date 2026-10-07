import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateVoucherDto {
  @IsString()
  voucherType!: string;

  @IsString()
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export class JournalLineDto {
  @IsString()
  accountCode!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  debit!: number;

  @IsNumber()
  @Min(0)
  credit!: number;
}

export class CreateJournalEntryDto {
  @IsString()
  sourceType!: string;

  @IsString()
  sourceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JournalLineDto)
  lines!: JournalLineDto[];
}

export class DeleteAccountingVoucherDto {
  @IsString()
  reason!: string;
}
