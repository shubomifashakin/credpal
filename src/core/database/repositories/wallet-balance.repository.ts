import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { WalletBalance } from '../entities/wallet-balances.entity';

@Injectable()
export class WalletBalanceRepository {
  constructor(
    @InjectRepository(WalletBalance)
    private readonly repo: Repository<WalletBalance>,
  ) {}

  async findByWalletIdAndCurrency(
    walletId: string,
    currency: string,
    manager?: EntityManager,
  ): Promise<WalletBalance | null> {
    const repo = manager ? manager.getRepository(WalletBalance) : this.repo;

    return repo.findOne({ where: { walletId, currency } });
  }

  async findAllByWalletId(walletId: string): Promise<WalletBalance[]> {
    return this.repo.find({ where: { walletId } });
  }

  async upsert(
    walletId: string,
    currency: string,
    manager?: EntityManager,
  ): Promise<WalletBalance> {
    const repo = manager ? manager.getRepository(WalletBalance) : this.repo;

    let balance = await repo.findOne({ where: { walletId, currency } });

    if (!balance) {
      balance = repo.create({
        walletId,
        currency,
        balance: '0',
      });

      await repo.save(balance);
    }

    return balance;
  }

  async findByWalletIdAndCurrencyWithLock(
    walletId: string,
    currency: string,
    manager: EntityManager,
  ): Promise<WalletBalance | null> {
    return manager.getRepository(WalletBalance).findOne({
      where: { walletId, currency },
      lock: { mode: 'pessimistic_write' },
    });
  }

  async updateBalance(
    walletId: string,
    currency: string,
    newBalance: string,
    manager: EntityManager,
  ): Promise<void> {
    await manager
      .getRepository(WalletBalance)
      .update({ walletId, currency }, { balance: newBalance });
  }

  async save(
    balance: WalletBalance,
    manager?: EntityManager,
  ): Promise<WalletBalance> {
    const repo = manager ? manager.getRepository(WalletBalance) : this.repo;

    return repo.save(balance);
  }
}
