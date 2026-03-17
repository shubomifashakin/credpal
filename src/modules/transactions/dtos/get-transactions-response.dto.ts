import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  TransactionType,
  TransactionStatus,
} from '../../../core/database/entities/transactions.entity';

export class TransactionDto {
  @ApiProperty({ description: 'Transaction ID' })
  id: string;

  @ApiProperty({ enum: TransactionType, description: 'Transaction type' })
  type: TransactionType;

  @ApiProperty({ enum: TransactionStatus, description: 'Transaction status' })
  status: TransactionStatus;

  @ApiPropertyOptional({ description: 'Currency it was converted from' })
  fromCurrency: string | null;

  @ApiProperty({ description: 'Currency it was converted to' })
  toCurrency: string;

  @ApiPropertyOptional({ description: 'Amount it was converted from' })
  fromAmount: string | null;

  @ApiProperty({ description: 'Amount it was converted to' })
  toAmount: string;

  @ApiPropertyOptional({ description: 'Exchange rate used' })
  rate: string | null;

  @ApiProperty({ description: 'Transaction reference' })
  reference: string;

  @ApiProperty({ description: 'Transaction created at' })
  createdAt: Date;
}

export class GetTransactionsResponseDto {
  @ApiProperty({ type: [TransactionDto], description: 'List of transactions' })
  data: TransactionDto[];

  @ApiProperty({ description: 'Whether there are more transactions available' })
  hasNextPage: boolean;

  @ApiPropertyOptional({ nullable: true, description: 'Cursor for next page' })
  cursor: string | null;
}
