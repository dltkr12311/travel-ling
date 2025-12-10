import { IsOptional, IsString } from 'class-validator';

export class SaveTripDto {
  @IsString()
  id!: string;

  @IsOptional()
  data?: Record<string, unknown>;
}

export class CreateTripDto {
  @IsOptional()
  @IsString()
  id?: string;

  data?: Record<string, unknown>;
}
