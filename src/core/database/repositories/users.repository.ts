import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User, UserRole } from '../entities/users.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async create(data: {
    email: string;
    password: string;
    role?: UserRole;
    firstName: string;
    lastName: string;
  }): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  async markVerified(id: string): Promise<void> {
    await this.repo.update(id, { isVerified: true });
  }
}
