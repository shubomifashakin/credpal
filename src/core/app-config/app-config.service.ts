import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { makeError } from '../../common/utils';
import { FnResult } from '../../types/common.types';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get DatabaseUrl(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('DATABASE_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get RedisUrl(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('REDIS_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get NodeEnv(): FnResult<string> {
    try {
      const env = this.configService.get<string>('NODE_ENV', 'development');

      return { success: true, data: env, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get ServiceName(): FnResult<string> {
    try {
      const name = this.configService.getOrThrow<string>('SERVICE_NAME');

      return { success: true, data: name, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get BaseUrl(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('BASE_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get FrontendUrl(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('FRONTEND_URL');

      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get LogLevel(): FnResult<string> {
    try {
      const level = this.configService.get<string>('LOG_LEVEL', 'info');

      return { success: true, data: level, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get Domain(): FnResult<string> {
    try {
      const domain = this.configService.getOrThrow<string>('DOMAIN');

      return { success: true, data: domain, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get JwtPrivateKey(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('JWT_PRIVATE_KEY');

      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get JwtPublicKey(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('JWT_PUBLIC_KEY');

      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get FxApiKey(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('FX_API_KEY');
      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get FxApiUrl(): FnResult<string> {
    try {
      const url = this.configService.getOrThrow<string>('FX_API_URL');
      return { success: true, data: url, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get ResendApiKey(): FnResult<string> {
    try {
      const key = this.configService.getOrThrow<string>('RESEND_API_KEY');
      return { success: true, data: key, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }

  get MailFrom(): FnResult<string> {
    try {
      const from = this.configService.getOrThrow<string>('MAIL_FROM');
      return { success: true, data: from, error: null };
    } catch (error) {
      return { success: false, data: null, error: makeError(error) };
    }
  }
}
