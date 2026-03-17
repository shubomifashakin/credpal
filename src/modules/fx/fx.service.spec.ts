import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';

import { FxService } from './fx.service';

import { RedisService } from '../../core/redis/redis.service';
import { AppConfigService } from '../../core/app-config/app-config.service';

const mockRedisService = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockAppConfigService = {
  FxApiKey: { success: true, data: 'test-key' },
  FxApiUrl: { success: true, data: 'testapi.example' },
};

const mockLogger = {
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
};

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('FxService', () => {
  let service: FxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
      ],
    }).compile();

    service = module.get<FxService>(FxService);

    module.useLogger(mockLogger);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get fresh rates for the currency from cache', async () => {
    const rates = { USD: 1, EUR: 0.85, GBP: 0.75 };
    mockRedisService.get.mockResolvedValue({
      success: true,
      data: {
        rates,
        cachedAt: new Date().toISOString(),
      },
    });

    const response = await service.getRates('USD');

    expect(response.rates).toBeDefined();
    expect(response.rates).toEqual(rates);
    expect(Object.keys(response.rates)).toHaveLength(3);
    expect(response.cachedAt).toBeDefined();
    expect(response.stale).toBe(false);
  });

  it('should get fresh rates for the currency from the api', async () => {
    const rates = { USD: 1, EUR: 0.85, GBP: 0.75 };
    mockRedisService.get.mockResolvedValue({
      success: true,
      data: null,
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        result: 'success',
        base_code: 'NGN',
        conversion_rates: rates,
        error_type: 'test:error',
      }),
    });

    const response = await service.getRates('NGN');

    expect(mockRedisService.get).toHaveBeenCalledTimes(1);
    expect(mockRedisService.set).toHaveBeenCalledTimes(2);
    expect(response.rates).toBeDefined();
    expect(response.rates).toEqual(rates);
    expect(Object.keys(response.rates)).toHaveLength(3);
    expect(response.cachedAt).toBeDefined();
    expect(response.stale).toBe(false);
  });

  it('should get stale rates for the currency from cache', async () => {
    const rates = { USD: 1, EUR: 0.85, GBP: 0.75 };
    mockRedisService.get
      .mockResolvedValueOnce({
        success: true,
        data: null,
      })
      .mockResolvedValue({
        success: true,
        data: { rates, cachedAt: new Date().toISOString() },
      });

    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        result: 'success',
        base_code: 'NGN',
        conversion_rates: rates,
        error_type: 'test:error',
      }),
    });

    const response = await service.getRates('NGN');

    expect(mockRedisService.get).toHaveBeenCalledTimes(2);
    expect(mockRedisService.set).toHaveBeenCalledTimes(0);
    expect(response.rates).toBeDefined();
    expect(response.rates).toEqual(rates);
    expect(Object.keys(response.rates)).toHaveLength(3);
    expect(response.cachedAt).toBeDefined();
    expect(response.stale).toBe(true);
  });

  it('should fail to get rates', async () => {
    const rates = { USD: 1, EUR: 0.85, GBP: 0.75 };
    mockRedisService.get
      .mockResolvedValueOnce({
        success: true,
        data: null,
      })
      .mockResolvedValue({
        success: false,
        data: null,
      });

    mockFetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        result: 'success',
        base_code: 'NGN',
        conversion_rates: rates,
        error_type: 'test:error',
      }),
    });

    await expect(service.getRates('NGN')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
