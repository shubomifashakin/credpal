import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { FxService } from './fx.service';
import { FxController } from './fx.controller';
import { RedisService } from '../../core/redis/redis.service';

const mockFxService = {
  getRates: jest.fn(),
};

const mockJwtService = {
  verifyAsync: jest.fn(),
};

const mockRedisService = {
  get: jest.fn(),
};

describe('FxController', () => {
  let controller: FxController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: FxService, useValue: mockFxService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
      ],
      controllers: [FxController],
    }).compile();

    controller = module.get<FxController>(FxController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should get the rates', async () => {
    mockFxService.getRates.mockResolvedValue(null);

    await controller.getRates('USD');

    expect(mockFxService.getRates).toHaveBeenCalledWith('USD');
  });
});
