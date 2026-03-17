import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './users.entity';
import { Wallet } from './wallets.entity';

export enum TransactionType {
  FUNDING = 'FUNDING',
  CONVERSION = 'CONVERSION',
  TRADE = 'TRADE',
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'wallet_id' })
  walletId: string;

  @Column({ type: 'enum', enum: TransactionType, name: 'type' })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
    name: 'status',
  })
  status: TransactionStatus;

  @Column({ length: 3, nullable: true, name: 'from_currency' })
  fromCurrency: string;

  @Column({ length: 3, name: 'to_currency' })
  toCurrency: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
    name: 'from_amount',
  })
  fromAmount: string;

  @Column({ type: 'numeric', precision: 20, scale: 8, name: 'to_amount' })
  toAmount: string;

  @Column({
    type: 'numeric',
    precision: 20,
    scale: 8,
    nullable: true,
    name: 'rate',
  })
  rate: string;

  @Column({ unique: true, name: 'reference' })
  reference: string;

  @Column({ type: 'jsonb', nullable: true, name: 'metadata' })
  metadata: Record<string, any>;

  @ManyToOne(() => User, (user) => user.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Wallet, (wallet) => wallet.transactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'wallet_id' })
  wallet: Wallet;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
