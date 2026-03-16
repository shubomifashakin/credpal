import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { Wallet } from '../entities/wallets.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  async create(userId: string): Promise<Wallet> {
    const wallet = this.repo.create({ userId });
    return this.repo.save(wallet);
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { userId },
      relations: ['balances'],
    });
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['balances'],
    });
  }
}
