import { Request, Response } from 'express';
import {
  Injectable,
  CallHandler,
  NestInterceptor,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'crypto';
import { Observable, of, throwError, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

import { RedisService } from '../../../core/redis/redis.service';
import {
  IDEMPOTENCY_KEY,
  IdempotencyOptions,
} from '../../decorators/idempotency.decorator';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const options = this.reflector.get<IdempotencyOptions>(
      IDEMPOTENCY_KEY,
      context.getHandler(),
    );

    if (!options) return next.handle();

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const idempotencyKey = request.headers['x-idempotency-key'] as string;

    if (!idempotencyKey) {
      if (options.required) {
        throw new BadRequestException('x-idempotency-key header is required');
      }

      return next.handle();
    }

    const userId = request.user?.id || 'unknown';
    const keyHash = createHash('sha256')
      .update(`${idempotencyKey}:${userId}`)
      .digest('hex');

    const redisKey = `idempotency:${keyHash}`;

    const cached = await this.redisService.get<{
      status: number;
      body: unknown;
    }>(redisKey);

    if (cached.success && cached.data) {
      response.status(cached.data.status);
      return of(cached.data.body);
    }

    return next.handle().pipe(
      switchMap((data) =>
        from(
          this.redisService.set(
            redisKey,
            { status: response.statusCode, body: data },
            { EX: options.expiresInSeconds, NX: true },
          ),
        ).pipe(switchMap(() => of(data))),
      ),
      catchError((error: Error) => throwError(() => error)),
    );
  }
}
