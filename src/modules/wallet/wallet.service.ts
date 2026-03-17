import { DataSource } from 'typeorm';
import {
  Logger,
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

import { v4 as uuid } from 'uuid';

import { TradeDto } from './dtos/trade.dto';
import { FundWalletDto } from './dtos/fund-wallet.dto';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';

import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import { TransactionRepository } from '../../core/database/repositories/transactions.repository';
import { WalletBalanceRepository } from '../../core/database/repositories/wallet-balance.repository';
import {
  TransactionType,
  TransactionStatus,
} from '../../core/database/entities/transactions.entity';
import { FxService } from '../fx/fx.service';
import { SwapResponseDto } from './dtos/swap-response.dto';
import { FundWalletResponseDto } from './dtos/fund-wallet-response.dto';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly walletsRepo: WalletRepository,
    private readonly walletBalancesRepo: WalletBalanceRepository,
    private readonly transactionRepository: TransactionRepository,

    private readonly fxService: FxService,

    private readonly dataSource: DataSource,
  ) {}

  async getWalletBalances(userId: string) {
    const wallet = await this.walletsRepo.findByUserId(userId);

    if (!wallet) {
      this.logger.warn({
        message: `user:${userId} does not have a wallet`,
      });

      throw new NotFoundException('User does not have a wallet');
    }

    return {
      walletId: wallet.id,
      balances: wallet.balances.map((b) => ({
        currency: b.currency,
        balance: b.balance,
      })),
    };
  }

  async fund(
    userId: string,
    dto: FundWalletDto,
  ): Promise<FundWalletResponseDto> {
    const wallet = await this.walletsRepo.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const queryManager = queryRunner.manager;

      //acquire a lock on the current wallet balance
      let balance =
        await this.walletBalancesRepo.findByWalletIdAndCurrencyWithLock(
          wallet.id,
          dto.currency,
          queryManager,
        );

      //if no wallet balance exists for that currency, create one
      if (!balance) {
        balance = await this.walletBalancesRepo.upsert(
          wallet.id,
          dto.currency,
          queryManager,
        );
      }

      const current = parseFloat(balance?.balance ?? '0');
      const newBalance = (current + dto.amount).toFixed(8);

      await this.walletBalancesRepo.updateBalance(
        wallet.id,
        dto.currency,
        newBalance,
        queryManager,
      );

      const reference = uuid();

      await this.transactionRepository.create(
        {
          userId,
          walletId: wallet.id,
          type: TransactionType.FUNDING,
          status: TransactionStatus.SUCCESS,
          toCurrency: dto.currency,
          toAmount: dto.amount.toFixed(8),
          reference,
        },
        queryManager,
      );

      await queryRunner.commitTransaction();

      return {
        message: 'Wallet funded successfully',
        currency: dto.currency,
        amount: dto.amount.toString(),
        newBalance,
        reference,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async convert(userId: string, dto: ConvertCurrencyDto) {
    return this.executeSwap(userId, dto, TransactionType.CONVERSION);
  }

  async trade(userId: string, dto: TradeDto) {
    return this.executeSwap(userId, dto, TransactionType.TRADE);
  }

  private async executeSwap(
    userId: string,
    dto: ConvertCurrencyDto | TradeDto,
    type: TransactionType,
  ): Promise<SwapResponseDto> {
    const wallet = await this.walletsRepo.findByUserId(userId);

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    // fetch rate first before opening transaction
    const rateResult = await this.fxService.getRate(
      dto.fromCurrency,
      dto.toCurrency,
    );

    if (!rateResult.success || !rateResult.data) {
      this.logger.error({
        message: 'Failed to fetch exchange rate',
        error: rateResult.error,
      });
      throw new InternalServerErrorException();
    }

    const rate = rateResult.data.rate;
    const toAmount = (dto.amount * rate).toFixed(8);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const queryManager = queryRunner.manager;

      // lock source balance row
      const fromBalance =
        await this.walletBalancesRepo.findByWalletIdAndCurrencyWithLock(
          wallet.id,
          dto.fromCurrency,
          queryManager,
        );

      if (!fromBalance) {
        throw new BadRequestException(`No ${dto.fromCurrency} balance found`);
      }

      const currentFrom = parseFloat(fromBalance.balance);

      if (currentFrom < dto.amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const newFromBalance = (currentFrom - dto.amount).toFixed(8);

      // upsert destination balance row, basically create it if first time holding this currency
      await this.walletBalancesRepo.upsert(
        wallet.id,
        dto.toCurrency,
        queryManager,
      );

      // lock destination balance row
      const toBalance =
        await this.walletBalancesRepo.findByWalletIdAndCurrencyWithLock(
          wallet.id,
          dto.toCurrency,
          queryManager,
        );

      if (!toBalance) {
        this.logger.error({
          message: `Failed to create/find destination wallet balance ${wallet.id}: ${dto.toCurrency}`,
        });

        throw new InternalServerErrorException();
      }

      const currentTo = parseFloat(toBalance.balance);
      const newToBalance = (currentTo + parseFloat(toAmount)).toFixed(8);

      // update both balances
      await this.walletBalancesRepo.updateBalance(
        wallet.id,
        dto.fromCurrency,
        newFromBalance,
        queryManager,
      );

      await this.walletBalancesRepo.updateBalance(
        wallet.id,
        dto.toCurrency,
        newToBalance,
        queryManager,
      );

      const reference = uuid();

      await this.transactionRepository.create(
        {
          userId,
          walletId: wallet.id,
          type,
          status: TransactionStatus.SUCCESS,
          fromCurrency: dto.fromCurrency,
          fromAmount: dto.amount.toFixed(8),
          toCurrency: dto.toCurrency,
          toAmount,
          rate: rate.toFixed(8),
          reference,
          metadata: { stale: rateResult.data.stale },
        },
        queryManager,
      );

      await queryRunner.commitTransaction();

      return {
        message: `success`,
        fromCurrency: dto.fromCurrency,
        fromAmount: dto.amount,
        toCurrency: dto.toCurrency,
        toAmount: parseFloat(toAmount),
        rate,
        reference,
        stale: rateResult.data.stale,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
