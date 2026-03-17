import { Test, TestingModule } from '@nestjs/testing';

import { TransactionsService } from './transactions.service';

import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import { TransactionRepository } from '../../core/database/repositories/transactions.repository';
import {
  TransactionStatus,
  TransactionType,
} from '../../core/database/entities/transactions.entity';

const mockTransactionsRepository = {
  findPaginatedByUserId: jest.fn(),
};

const mockWalletRepository = {
  findByUserId: jest.fn(),
};

describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: WalletRepository, useValue: mockWalletRepository },
        {
          provide: TransactionRepository,
          useValue: mockTransactionsRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get users transactions', async () => {
    mockWalletRepository.findByUserId.mockResolvedValue({
      id: 'test-wallet-id',
      userId: 'test-user-id',
      balance: 1000,
      currency: 'NGN',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockTransactionsRepository.findPaginatedByUserId.mockResolvedValue({
      data: [
        {
          id: 'test-transaction-id',
          userId: 'test-user-id',
          amount: 1000,
          currency: 'NGN',
          type: 'credit',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      hasNextPage: false,
      cursor: null,
    });

    const response = await service.getTransactions('test-user-id', {});
    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.hasNextPage).toBe(false);
    expect(response.cursor).toBeNull();
  });

  it('should get users transactions with query parameters', async () => {
    mockWalletRepository.findByUserId.mockResolvedValue({
      id: 'test-wallet-id',
      userId: 'test-user-id',
      balance: 1000,
      currency: 'NGN',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    mockTransactionsRepository.findPaginatedByUserId.mockResolvedValue({
      data: [
        {
          id: 'test-transaction-id',
          userId: 'test-user-id',
          amount: 1000,
          currency: 'NGN',
          type: 'credit',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      hasNextPage: false,
      cursor: null,
    });

    const response = await service.getTransactions('test-user-id', {
      limit: 10,
      type: TransactionType.FUNDING,
      status: TransactionStatus.SUCCESS,
    });

    expect(
      mockTransactionsRepository.findPaginatedByUserId,
    ).toHaveBeenCalledWith({
      userId: 'test-user-id',
      cursor: undefined,
      limit: 10,
      type: TransactionType.FUNDING,
      status: TransactionStatus.SUCCESS,
    });

    expect(response).toBeDefined();
    expect(response.data).toHaveLength(1);
    expect(response.hasNextPage).toBe(false);
    expect(response.cursor).toBeNull();
  });
});
