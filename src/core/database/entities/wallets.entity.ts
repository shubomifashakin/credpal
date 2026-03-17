import {
  Column,
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from './users.entity';
import { Transaction } from './transactions.entity';
import { WalletBalance } from './wallet-balances.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.wallet)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => WalletBalance, (balance) => balance.wallet, {
    onDelete: 'CASCADE',
  })
  balances: WalletBalance[];

  @OneToMany(() => Transaction, (tx) => tx.wallet, {
    onDelete: 'CASCADE',
  })
  transactions: Transaction[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
