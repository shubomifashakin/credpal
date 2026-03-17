import { plainToInstance, Transform } from 'class-transformer';
import {
  IsUrl,
  IsString,
  IsNotEmpty,
  validateSync,
  IsEmail,
} from 'class-validator';
import { FnResult } from '../types/common.types';

class EnvConfig {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsUrl({ require_tld: false })
  BASE_URL: string;

  @IsUrl({ require_tld: false })
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.replace(/\n/g, ''))
  JWT_PRIVATE_KEY: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.replace(/\n/g, ''))
  JWT_PUBLIC_KEY: string;

  @IsString()
  @IsNotEmpty()
  SERVICE_NAME: string;

  @IsString()
  @IsNotEmpty()
  DOMAIN: string;

  @IsString()
  @IsNotEmpty()
  LOG_LEVEL: string;

  @IsString()
  @IsNotEmpty()
  NODE_ENV: string;

  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;

  @IsString()
  @IsNotEmpty()
  FX_API_KEY: string;

  @IsUrl({ require_tld: false })
  FX_API_URL: string;

  @IsString()
  @IsNotEmpty()
  RESEND_API_KEY: string;

  @IsEmail()
  MAIL_FROM: string;
}

export function validateConfig(config: Record<string, string>) {
  const envConfig = plainToInstance(EnvConfig, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(envConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error.toString()).join(', '));
  }

  return envConfig;
}

export function makeError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const err = new Error(String(error.message));
    if ('name' in error && error.name) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      err.name = String(error.name);
    }
    if ('stack' in error && error.stack) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      err.stack = String(error.stack);
    }
    return err;
  }

  return new Error(String(error));
}

export function makeBlacklistedKey(token: string): string {
  return `blacklist:${token}`;
}

export function makeUserKey(userId: string): string {
  return `user:${userId}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry<T>(
  url: string,
  attempts: number = 3,
): Promise<FnResult<T>> {
  const delays = [0, 500, 1500];

  let apiResponse: FnResult<T> = {
    success: false,
    data: null,
    error: new Error('Api Unavailable'),
  };

  for (let i = 0; i < attempts; i++) {
    try {
      if (delays[i] > 0) {
        await sleep(delays[i]);
      }

      const response = await fetch(url);

      if (!response.ok) {
        apiResponse = {
          success: false,
          data: null,
          error: new Error(`HTTP ${response.status}: ${response.statusText}`),
        };

        continue;
      }

      const data = (await response.json()) as T;

      apiResponse = { success: true, data, error: null };
      break;
    } catch (error) {
      if (i === attempts - 1) {
        apiResponse = { success: false, data: null, error: makeError(error) };
      }
    }
  }

  return apiResponse;
}
