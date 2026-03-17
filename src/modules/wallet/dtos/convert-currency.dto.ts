import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

import { IsNotSameCurrency } from '../validators/is-not-same-currency.validator';

import { SUPPORTED_CURRENCIES } from '../../../common/constants';

export class ConvertCurrencyDto {
  @ApiProperty({
    description: 'The currency to convert from',
    example: 'USD',
    enum: SUPPORTED_CURRENCIES,
  })
  @IsNotEmpty()
  @IsIn(SUPPORTED_CURRENCIES)
  fromCurrency: string;

  @ApiProperty({
    description: 'The amount to convert',
    example: 100,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'The currency to convert to',
    example: 'NGN',
    enum: SUPPORTED_CURRENCIES,
  })
  @IsNotEmpty()
  @IsIn(SUPPORTED_CURRENCIES)
  @IsNotSameCurrency('fromCurrency')
  toCurrency: string;
}
