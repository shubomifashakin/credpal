import { type Request } from 'express';

import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { TransactionsService } from './transactions.service';
import { TransactionQueryDto } from './dtos/transaction-query.dto';
import { GetTransactionsResponseDto } from './dtos/get-transactions-response.dto';

import { AuthGuard } from '../../common/guards/auth-guard/auth-guard.guard';

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: 'Get transaction history' })
  @ApiResponse({
    status: 200,
    description: 'Transactions returned',
    type: GetTransactionsResponseDto,
  })
  @Get()
  getTransactions(
    @Req() req: Request,
    @Query() query: TransactionQueryDto,
  ): Promise<GetTransactionsResponseDto> {
    return this.transactionsService.getTransactions(req.user.id, query);
  }
}
