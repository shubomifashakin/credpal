import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { WalletService } from './wallet.service';

import { RedisService } from '../../core/redis/redis.service';

import { FxService } from '../fx/fx.service';
import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import { WalletBalanceRepository } from '../../core/database/repositories/wallet-balance.repository';
import { TransactionRepository } from '../../core/database/repositories/transactions.repository';

const mockWalletsRepo = {
  findByUserId: jest.fn(),
};

const mockWalletBalancesRepo = {
  findByWalletIdAndCurrencyWithLock: jest.fn(),
  upsert: jest.fn(),
  updateBalance: jest.fn(),
};

const mockTransactionsRepo = {
  create: jest.fn(),
};

const mockFxService = {
  getRate: jest.fn(),
};

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const mockConnectFn = jest.fn();
const mockStartTransactionFn = jest.fn();
const mockCommitTransactionFn = jest.fn();
const mockRollbackTransactionFn = jest.fn();
const mockReleaseFn = jest.fn();

const mockDatasource = {
  createQueryRunner: jest.fn().mockReturnValue({
    connect: mockConnectFn,
    startTransaction: mockStartTransactionFn,
    manager: {},
    release: mockReleaseFn,
    commitTransaction: mockCommitTransactionFn,
    rollbackTransaction: mockRollbackTransactionFn,
  }),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: FxService, useValue: mockFxService },
        { provide: RedisService, useValue: {} },
        { provide: WalletRepository, useValue: mockWalletsRepo },
        { provide: TransactionRepository, useValue: mockTransactionsRepo },
        { provide: WalletBalanceRepository, useValue: mockWalletBalancesRepo },
        { provide: DataSource, useValue: mockDatasource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);

    module.useLogger(mockLogger);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get the users wallet balances', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'USD',
          balance: '100',
        },
      ],
    });

    const response = await service.getWalletBalances('user-123');
    expect(response).toBeDefined();
    expect(response.walletId).toBe('wallet-123');
    expect(response.balances).toHaveLength(1);
    expect(response.balances[0].currency).toBe('USD');
    expect(response.balances[0].balance).toBe('100');
  });

  it('should not get the users wallet balances since the user does not have a wallet', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue(null);

    await expect(service.getWalletBalances('user-123')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should fund the users wallet', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'USD',
          balance: '100',
        },
      ],
    });

    mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock.mockResolvedValue(
      null,
    );

    mockWalletBalancesRepo.upsert.mockResolvedValue({
      id: 'balance-123',
      walletId: 'wallet-123',
      currency: 'USD',
      balance: '0',
    });

    mockWalletBalancesRepo.updateBalance.mockResolvedValue(null);

    mockTransactionsRepo.create.mockResolvedValue(null);

    const response = await service.fund('test-id', {
      amount: 100,
      currency: 'USD',
    });

    expect(response.newBalance).toBe(Number(100).toFixed(8));
    expect(response.currency).toBe('USD');
  });

  it('should not fund the users wallet if there is no wallet', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue(null);

    await expect(
      service.fund('test-id', {
        amount: 100,
        currency: 'USD',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should convert the amount to the target currency', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'USD',
          balance: '100',
        },
      ],
    });

    mockFxService.getRate.mockResolvedValue({
      success: true,
      data: {
        rate: 1.2,
        stale: false,
      },
    });

    mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock.mockResolvedValueOnce(
      {
        id: 'balance-123',
        walletId: 'wallet-123',
        currency: 'USD',
        balance: '100',
      },
    );

    mockWalletBalancesRepo.upsert.mockResolvedValue(null);

    mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock.mockResolvedValueOnce(
      {
        id: 'balance-456',
        walletId: 'wallet-123',
        currency: 'EUR',
        balance: '0',
      },
    );

    mockWalletBalancesRepo.updateBalance.mockResolvedValue(null);

    mockTransactionsRepo.create.mockResolvedValue(null);

    const response = await service.convert('test-user-id', {
      amount: 100,
      toCurrency: 'EUR',
      fromCurrency: 'USD',
    });

    expect(response.stale).toBe(false);
    expect(response.toAmount).toBe(Number(100 * 1.2).toFixed(8));
  });

  it('should not convert the amount since the user does not have sufficient balance', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'USD',
          balance: '10',
        },
      ],
    });

    mockFxService.getRate.mockResolvedValue({
      success: true,
      data: {
        rate: 1.2,
        stale: false,
      },
    });

    mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock.mockResolvedValueOnce(
      {
        id: 'balance-123',
        walletId: 'wallet-123',
        currency: 'USD',
        balance: '10',
      },
    );

    await expect(
      service.convert('test-user-id', {
        amount: 100,
        toCurrency: 'EUR',
        fromCurrency: 'USD',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock,
    ).toHaveBeenCalledTimes(1);

    expect(mockRollbackTransactionFn).toHaveBeenCalled();
    expect(mockReleaseFn).toHaveBeenCalled();
  });

  it('should not convert the amount since the user does not have a balance in that currency', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'NGN',
          balance: '10',
        },
      ],
    });

    mockFxService.getRate.mockResolvedValue({
      success: true,
      data: {
        rate: 1.2,
        stale: false,
      },
    });

    mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock.mockResolvedValue(
      null,
    );

    await expect(
      service.convert('test-user-id', {
        amount: 100,
        toCurrency: 'EUR',
        fromCurrency: 'USD',
      }),
    ).rejects.toThrow(BadRequestException);

    expect(
      mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock,
    ).toHaveBeenCalledTimes(1);

    expect(mockRollbackTransactionFn).toHaveBeenCalled();
  });

  it('should not convert the amount because the rate api failed', async () => {
    mockWalletsRepo.findByUserId.mockResolvedValue({
      id: 'wallet-123',
      userId: 'user-123',
      balances: [
        {
          currency: 'NGN',
          balance: '10',
        },
      ],
    });

    mockFxService.getRate.mockResolvedValue({
      success: false,
      error: new Error('test-error'),
    });

    await expect(
      service.convert('test-user-id', {
        amount: 100,
        toCurrency: 'EUR',
        fromCurrency: 'USD',
      }),
    ).rejects.toThrow(InternalServerErrorException);

    expect(
      mockWalletBalancesRepo.findByWalletIdAndCurrencyWithLock,
    ).toHaveBeenCalledTimes(0);

    expect(mockReleaseFn).not.toHaveBeenCalled();
  });
});
