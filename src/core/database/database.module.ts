import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/users.entity';
import { Otp } from './entities/otps.entity';
import { Wallet } from './entities/wallets.entity';
import { WalletBalance } from './entities/wallet-balances.entity';
import { Transaction } from './entities/transactions.entity';
import { UserRepository } from './repositories/users.repository';
import { OtpRepository } from './repositories/otp.repository';
import { WalletRepository } from './repositories/wallet.repository';
import { WalletBalanceRepository } from './repositories/wallet-balance.repository';
import { TransactionRepository } from './repositories/transactions.repository';

const repositories = [
  UserRepository,
  OtpRepository,
  WalletRepository,
  WalletBalanceRepository,
  TransactionRepository,
];

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Otp, Wallet, WalletBalance, Transaction]),
  ],
  providers: [...repositories],
  exports: [...repositories],
})
export class DatabaseModule {}
