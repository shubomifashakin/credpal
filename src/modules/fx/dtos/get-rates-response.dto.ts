import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsObject, IsBoolean, IsDateString } from 'class-validator';

export class FxRatesResultDto {
  @ApiProperty({ description: 'Base currency' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Exchange rates',
    type: Object,
    example: { USD: 1500, EUR: 1200 },
  })
  @IsObject()
  rates: Record<string, number>;

  @ApiProperty({ type: Boolean, description: 'Whether the rate is stale' })
  @IsBoolean()
  stale: boolean;

  @ApiProperty({ type: Date, description: 'ISO 8601 date string' })
  @IsDateString()
  cachedAt: string;
}
