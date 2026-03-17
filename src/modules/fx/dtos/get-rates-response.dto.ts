import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsBoolean, IsDateString } from 'class-validator';

export class FxRatesResultDto {
  @IsString()
  currency: string;

  @IsObject()
  rates: Record<string, number>;

  @ApiProperty({ type: Boolean, description: 'Whether the rate is stale' })
  @IsBoolean()
  stale: boolean;

  @ApiProperty({ type: Date, description: 'ISO 8601 date string' })
  @IsDateString()
  cachedAt: string;
}
