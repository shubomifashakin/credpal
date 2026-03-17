import { EntityManager, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { User, UserRole } from '../entities/users.entity';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    const repo = manager ? manager.getRepository(User) : this.repo;
    return repo.findOne({ where: { email } });
  }

  async findById(id: string, manager?: EntityManager): Promise<User | null> {
    const repo = manager ? manager.getRepository(User) : this.repo;
    return repo.findOne({ where: { id } });
  }

  async create(
    data: {
      email: string;
      password: string;
      role?: UserRole;
      firstName: string;
      lastName: string;
    },
    manager?: EntityManager,
  ): Promise<User> {
    const repo = manager ? manager.getRepository(User) : this.repo;
    const user = repo.create(data);
    return repo.save(user);
  }

  async markVerified(id: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(User) : this.repo;
    await repo.update(id, { isVerified: true });
  }
}
