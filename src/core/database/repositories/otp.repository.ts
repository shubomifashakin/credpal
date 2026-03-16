import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Otp } from '../entities/otps.entity';

@Injectable()
export class OtpRepository {
  constructor(
    @InjectRepository(Otp)
    private readonly repo: Repository<Otp>,
  ) {}

  async create(data: {
    userId: string;
    code: string;
    expiresAt: Date;
  }): Promise<Otp> {
    const otp = this.repo.create(data);
    return this.repo.save(otp);
  }

  async findActiveByUserId(userId: string): Promise<Otp | null> {
    return this.repo.findOne({
      where: {
        userId,
        used: false,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async invalidateAllByUserId(userId: string): Promise<void> {
    await this.repo.update({ userId, used: false }, { used: true });
  }

  async markAsUsed(id: string): Promise<void> {
    await this.repo.update(id, { used: true });
  }
}
