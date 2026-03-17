import { Request } from 'express';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module, RequestMethod } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { v4 as uuid } from 'uuid';

import { LoggerModule } from 'nestjs-pino';

import { validateConfig } from './common/utils';
import { RedisModule } from './core/redis/redis.module';
import { RedisService } from './core/redis/redis.service';
import { MailerModule } from './core/mailer/mailer.module';
import { HasherModule } from './core/hasher/hasher.module';
import { AppDataSource } from './core/database/data-source';
import { DatabaseModule } from './core/database/database.module';
import { AppConfigModule } from './core/app-config/app-config.module';
import { AppConfigService } from './core/app-config/app-config.service';

import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: false,
      validate: (config) => {
        validateConfig(config);

        return config;
      },
    }),
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        messageKey: 'message',
        mixin(_context, level, logger) {
          return { level_label: logger.levels.labels[level] };
        },
        errorKey: 'error',
        level: process.env.LOG_LEVEL! || 'info',
        base: {
          service: process.env.SERVICE_NAME! || 'credpal-api',
          environment: process.env.NODE_ENV,
        },
        timestamp: () => `,"time":"${new Date(Date.now()).toISOString()}"`,
        transport: {
          targets:
            process.env.NODE_ENV !== 'production'
              ? [{ target: 'pino-pretty' }]
              : [
                  {
                    target: 'pino-roll',
                    level: 'info',
                    options: {
                      file: './logs/combined.log',
                      mkdir: true,
                      size: '2m',
                      frequency: 'daily',
                      limit: { count: 1 },
                      dateFormat: 'dd-MM-yyyy',
                    },
                  },
                ],
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.x-api-key',
            'res.headers.set-cookie',
            'res.headers["set-cookie"]',
            'token',
            '**.token',
            'accessToken',
            '**.accessToken',
            'refreshToken',
            '**.refreshToken',
            'req.body.secret',
            'req.body.token',
            'req.body.accessToken',
            'req.body.refreshToken',
            'req.headers.cookie',
            'req.query.token',
            'req.cookies',
            'req.cookies.*',
            'password',
            '*.*.password',
            '*.password',
            'email',
            '**.email',
            '**[*].email',
            '**[*].*email',
            '**.password',
            '**[*].password',
            '**[*].*password',
            'secret',
            'apiKey',
          ],
          remove: true,
        },
        genReqId: (req: Request) => {
          return (
            req?.requestId ||
            req.headers['x-request-id'] ||
            req.headers['X-Request-Id'] ||
            uuid()
          );
        },
        autoLogging: {
          ignore: (req) => ['/health'].includes(req.url ?? ''),
        },
      },
      exclude: [
        { path: '/health', method: RequestMethod.GET },
        { path: '/metrics', method: RequestMethod.GET },
      ],
      assignResponse: false,
    }),
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [RedisService],
      useFactory: (cache: RedisService) => {
        return {
          throttlers: [
            {
              ttl: 15,
              limit: 30,
              name: 'default',
              blockDuration: 60,
            },
          ],
          errorMessage: 'Too many requests',
          generateKey: (ctx, _, throttlerName) => {
            const req = ctx.switchToHttp().getRequest<Request>();

            const key =
              req?.user?.id || req?.ip || req?.ips?.[0] || 'unknown-ip';

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            const route = req.route?.path || req.path;

            return `${throttlerName}:${route}:${key}`.toLowerCase();
          },

          storage: {
            async increment(key, ttl, limit, blockDuration) {
              return await cache.ratelimit(key, ttl, limit, blockDuration);
            },
          },
        };
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => {
        return {
          ...AppDataSource.options,
          url: configService.DatabaseUrl.data!,
        };
      },
    }),
    DatabaseModule,
    JwtModule.registerAsync({
      global: true,
      imports: [AppConfigModule],
      useFactory: (configService: AppConfigService) => {
        return {
          signOptions: {
            expiresIn: '10m',
            algorithm: 'RS256',
          },
          verifyOptions: {
            algorithms: ['RS256'],
          },
          privateKey: configService.JwtPrivateKey.data!,
          publicKey: configService.JwtPublicKey.data!,
        };
      },
      inject: [AppConfigService],
    }),
    HasherModule,
    MailerModule,
    AuthModule,
  ],
  controllers: [],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
