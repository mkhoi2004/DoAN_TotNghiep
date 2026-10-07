import { IsOptional, IsString } from 'class-validator';

export class CreateEmrDto {
  @IsOptional()
  @IsString()
  clinicalNote?: string;
}