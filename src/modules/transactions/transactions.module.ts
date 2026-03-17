import { Module } from '@nestjs/common';

import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

import { RedisModule } from '../../core/redis/redis.module';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService],
  imports: [DatabaseModule, RedisModule],
})
export class TransactionsModule {}
