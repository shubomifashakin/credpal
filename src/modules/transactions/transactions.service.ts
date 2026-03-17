import { Injectable, Logger, NotFoundException } from '@nestjs/common';

import { GetTransactionsResponseDto } from './dtos/get-transactions-response.dto';

import { TransactionQueryDto } from './dtos/transaction-query.dto';

import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import { TransactionRepository } from '../../core/database/repositories/transactions.repository';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async getTransactions(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<GetTransactionsResponseDto> {
    const wallet = await this.walletRepository.findByUserId(userId);

    if (!wallet) {
      this.logger.debug({
        message: `Wallet not found for user`,
        userId,
      });

      throw new NotFoundException('Wallet not found');
    }

    const {
      data,
      hasNextPage,
      cursor: nextCursor,
    } = await this.transactionRepository.findPaginatedByUserId({
      userId,
      cursor: query.cursor,
      limit: query.limit,
      type: query.type,
      status: query.status,
    });

    return {
      data,
      hasNextPage,
      cursor: nextCursor || null,
    };
  }
}
