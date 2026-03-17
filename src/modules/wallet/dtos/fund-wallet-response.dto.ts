import { ApiProperty } from '@nestjs/swagger';

export class FundWalletResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Wallet funded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Amount funded',
    example: '100.00',
  })
  amount: string;

  @ApiProperty({
    description: 'New balance after funding',
    example: '100.00',
  })
  newBalance: string;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'txn_123456789',
  })
  reference: string;
}
