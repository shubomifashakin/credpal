import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

import { Transaction } from '../../../core/database/entities/transactions.entity';

export class GetTransactionsResponseDto {
  data: Transaction[];

  @ApiProperty({
    type: Boolean,
    description: 'Whether there are more transactions to fetch',
  })
  @IsBoolean()
  hasNextPage: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description: 'Cursor for next page',
  })
  @IsString()
  cursor?: string;
}
