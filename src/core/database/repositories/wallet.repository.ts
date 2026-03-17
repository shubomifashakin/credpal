import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { EntityManager, Repository } from 'typeorm';

import { Wallet } from '../entities/wallets.entity';

@Injectable()
export class WalletRepository {
  constructor(
    @InjectRepository(Wallet)
    private readonly repo: Repository<Wallet>,
  ) {}

  async create(userId: string, manager?: EntityManager): Promise<Wallet> {
    const repo = manager ? manager.getRepository(Wallet) : this.repo;
    const wallet = repo.create({ userId });
    return repo.save(wallet);
  }

  async findByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<Wallet | null> {
    const repo = manager ? manager.getRepository(Wallet) : this.repo;
    return repo.findOne({
      where: { userId },
      relations: ['balances'],
    });
  }

  async findById(id: string, manager?: EntityManager): Promise<Wallet | null> {
    const repo = manager ? manager.getRepository(Wallet) : this.repo;
    return repo.findOne({
      where: { id },
      relations: ['balances'],
    });
  }
}
