import { IsIn, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

import { SUPPORTED_CURRENCIES } from '../../../common/constants';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({
    description: 'The currency to fund',
    example: 'USD',
    enum: SUPPORTED_CURRENCIES,
  })
  @IsNotEmpty()
  @IsIn(SUPPORTED_CURRENCIES)
  currency: string;

  @ApiProperty({
    description: 'The amount to fund',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
