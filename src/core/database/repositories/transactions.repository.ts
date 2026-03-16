import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from '../entities/transactions.entity';

@Injectable()
export class TransactionRepository {
  constructor(
    @InjectRepository(Transaction)
    private readonly repo: Repository<Transaction>,
  ) {}

  async create(
    data: {
      userId: string;
      walletId: string;
      type: TransactionType;
      status: TransactionStatus;
      toCurrency: string;
      toAmount: string;
      fromCurrency?: string;
      fromAmount?: string;
      rate?: string;
      reference: string;
      metadata?: Record<string, any>;
    },
    manager?: EntityManager,
  ): Promise<Transaction> {
    const repo = manager ? manager.getRepository(Transaction) : this.repo;

    const tx = repo.create(data);
    return repo.save(tx);
  }

  async updateStatus(
    id: string,
    status: TransactionStatus,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Transaction) : this.repo;

    await repo.update(id, { status });
  }

  async findPaginatedByUserId(
    userId: string,
    page: number,
    limit: number,
    type?: TransactionType,
    status?: TransactionStatus,
  ): Promise<{ data: Transaction[]; total: number }> {
    const query = this.repo
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .orderBy('tx.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (type) query.andWhere('tx.type = :type', { type });
    if (status) query.andWhere('tx.status = :status', { status });

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }
}
