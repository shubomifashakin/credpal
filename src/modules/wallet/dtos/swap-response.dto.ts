import { ApiProperty } from '@nestjs/swagger';

export class SwapResponseDto {
  @ApiProperty({ description: 'The success message' })
  message: string;

  @ApiProperty({ description: 'The currency to convert/trade from' })
  fromCurrency: string;

  @ApiProperty({ description: 'The currency to convert/trade to' })
  toCurrency: string;

  @ApiProperty({ description: 'The amount to convert/trade from' })
  fromAmount: number;

  @ApiProperty({ description: 'The amount to convert/trade to' })
  toAmount: number;

  @ApiProperty({ description: 'The rate used' })
  rate: number;

  @ApiProperty({ description: 'The transaction reference' })
  reference: string;

  @ApiProperty({ description: 'Whether the rate was stale' })
  stale: boolean;
}
