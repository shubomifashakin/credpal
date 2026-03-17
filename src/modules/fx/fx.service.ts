import {
  Logger,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';

import { makeFxRateFreshCacheKey, makeFxRateStaleCacheKey } from './utils/fns';

import { RedisService } from '../../core/redis/redis.service';
import { AppConfigService } from '../../core/app-config/app-config.service';

import { FnResult } from '../../types/common.types';
import { fetchWithRetry, makeError } from '../../common/utils';
import { MINUTES_30, SUPPORTED_CURRENCIES } from '../../common/constants';

import { FxRateResponseDto } from './dtos/get-rate-response.dto';
import { FxRatesResultDto } from './dtos/get-rates-response.dto';

interface ExchangeRateApiResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: Record<string, number>;
  error_type?: string;
}

interface CachedRate {
  rates: Record<string, number>;
  cachedAt: string;
}

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: AppConfigService,
  ) {}

  async getRate(
    fromCurrency: string,
    toCurrency: string,
  ): Promise<FnResult<FxRateResponseDto>> {
    try {
      const ratesResult = await this.getRates(fromCurrency);

      const rate = ratesResult.rates[toCurrency];

      if (!rate) {
        this.logger.error({
          message: `Rate not found fo ${fromCurrency} to ${toCurrency}`,
        });

        return {
          success: false,
          error: new Error('Rate not found'),
          data: null,
        };
      }

      return {
        success: true,
        data: {
          rate,
          stale: ratesResult.stale,
          cachedAt: ratesResult.cachedAt,
        },
        error: null,
      };
    } catch (error) {
      return { error: makeError(error), data: null, success: false };
    }
  }

  async getRates(currency: string = 'NGN'): Promise<FxRatesResultDto> {
    const freshKey = makeFxRateFreshCacheKey(currency);
    const staleKey = makeFxRateStaleCacheKey(currency);

    const fresh = await this.redisService.get<CachedRate>(freshKey);

    if (fresh.success && fresh.data) {
      return {
        currency,
        ...fresh.data,
        stale: false,
      };
    }

    const fetchResult = await this.fetchAndCache(currency);

    if (fetchResult.success) {
      return fetchResult.data;
    }

    this.logger.warn({
      message: 'FX API unavailable, serving stale rates',
      currency,
      error: fetchResult.error,
    });

    const stale = await this.redisService.get<CachedRate>(staleKey);

    if (!stale.success) {
      this.logger.error({
        message: 'Failed to get stale FX rates',
        error: stale.error,
      });

      throw new InternalServerErrorException();
    }

    if (!stale.data) {
      throw new InternalServerErrorException();
    }

    this.logger.warn({
      message: 'Serving stale FX rates',
      currency,
      cachedAt: stale.data.cachedAt,
    });

    return {
      currency,
      rates: stale.data.rates,
      cachedAt: stale.data.cachedAt,
      stale: true,
    };
  }

  private async fetchAndCache(
    currency: string,
  ): Promise<FnResult<FxRatesResultDto>> {
    const apiKey = this.configService.FxApiKey.data;
    const apiUrl = this.configService.FxApiUrl.data;

    if (!apiKey || !apiUrl) {
      return {
        success: false,
        data: null,
        error: new Error('FX API configuration missing'),
      };
    }

    const result = await fetchWithRetry<ExchangeRateApiResponse>(
      `${apiUrl}/${apiKey}/latest/${currency}`,
    );

    if (!result.success) {
      return { success: false, data: null, error: result.error };
    }

    if (result.data.result !== 'success') {
      this.logger.error({
        message: 'Failed to get rates',
        error: result.data.error_type,
      });

      return {
        success: false,
        data: null,
        error: new Error(result.data.error_type),
      };
    }

    const rates: Record<string, number> = {};
    for (const currency of SUPPORTED_CURRENCIES) {
      if (result.data.conversion_rates[currency]) {
        rates[currency] = result.data.conversion_rates[currency];
      }
    }

    const cachedAt = new Date().toISOString();
    const payload = { rates, cachedAt };

    await this.redisService.set(makeFxRateFreshCacheKey(currency), payload, {
      EX: 60,
    });

    await this.redisService.set(makeFxRateStaleCacheKey(currency), payload, {
      EX: MINUTES_30,
    });

    return {
      error: null,
      success: true,
      data: { currency, rates, cachedAt, stale: false },
    };
  }
}
