import { EntityManager, Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Otp } from '../entities/otps.entity';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectRepository(Otp)
    private readonly repo: Repository<Otp>,
  ) {}

  async create(
    data: {
      userId: string;
      code: string;
      expiresAt: Date;
    },
    manager?: EntityManager,
  ): Promise<Otp> {
    const repo = manager ? manager.getRepository(Otp) : this.repo;
    const otp = repo.create(data);
    return repo.save(otp);
  }

  async findActiveByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<Otp | null> {
    const repo = manager ? manager.getRepository(Otp) : this.repo;
    return repo.findOne({
      where: {
        userId,
        used: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async invalidateAllByUserId(
    userId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(Otp) : this.repo;
    await repo.update({ userId, used: false }, { used: true });
  }

  async markAsUsed(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(Otp) : this.repo;
    await repo.update(id, { used: true });
  }
}
