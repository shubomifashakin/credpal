import {
  Column,
  Entity,
  Unique,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Wallet } from './wallets.entity';

@Entity('wallet_balances')
@Unique('wallet_id_currency_unique', ['walletId', 'currency'])
export class WalletBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({ length: 3 })
  currency: string;

  @Column({ type: 'numeric', precision: 20, scale: 8, default: '0' })
  balance: string;

  @ManyToOne(() => Wallet, (wallet) => wallet.balances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
