import { Module } from '@nestjs/common';
import { FxService } from './fx.service';
import { FxController } from './fx.controller';

import { RedisModule } from '../../core/redis/redis.module';
import { AppConfigModule } from '../../core/app-config/app-config.module';

@Module({
  providers: [FxService],
  controllers: [FxController],
  imports: [RedisModule, AppConfigModule],
  exports: [FxService],
})
export class FxModule {}
