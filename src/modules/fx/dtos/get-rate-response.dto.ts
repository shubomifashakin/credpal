import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber } from 'class-validator';

export class FxRateResponseDto {
  @ApiProperty({ type: Number, description: 'The exchange rate' })
  @IsNumber()
  rate: number;

  @ApiProperty({ type: Boolean, description: 'Whether the rate is stale' })
  @IsBoolean()
  stale: boolean;

  @ApiProperty({ type: String, description: 'ISO 8601 date string' })
  @IsDateString()
  cachedAt: string;
}
