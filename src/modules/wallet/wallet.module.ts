import { Module } from '@nestjs/common';

import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';

import { FxModule } from '../fx/fx.module';

import { RedisModule } from '../../core/redis/redis.module';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  providers: [WalletService],
  controllers: [WalletController],
  imports: [DatabaseModule, RedisModule, FxModule],
})
export class WalletModule {}
