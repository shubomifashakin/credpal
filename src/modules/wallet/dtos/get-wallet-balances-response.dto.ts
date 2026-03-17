import { ApiProperty } from '@nestjs/swagger';
import { SUPPORTED_CURRENCIES } from '../../../common/constants';

class Balances {
  @ApiProperty({
    description: 'Currency code',
    type: 'string',
    example: 'USD',
    enum: SUPPORTED_CURRENCIES,
  })
  currency: string;

  @ApiProperty({
    description: 'Balance amount',
    type: 'string',
    example: Number(1000).toFixed(8),
  })
  balance: string;
}

export class GetWalletBalancesResponseDto {
  @ApiProperty({ description: 'Wallet ID', type: 'string', example: '1234568' })
  walletId: string;

  @ApiProperty({
    type: Balances,
    isArray: true,
    description: 'Wallet balances',
  })
  balances: Balances[];
}
