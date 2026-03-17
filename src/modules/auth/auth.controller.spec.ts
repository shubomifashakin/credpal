import { Response } from 'express';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AppConfigService } from '../../core/app-config/app-config.service';

const mockConfigService = {
  MailFrom: { data: 'test@example.com', success: true },
  NodeEnv: { data: 'development', success: true },
};

const mockAutService = {
  verify: jest.fn(),
  register: jest.fn(),
};

const mockResponse = {
  cookie: jest.fn(),
} as unknown as jest.Mocked<Response>;

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAutService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register the user', async () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'FirstName',
      lastName: 'LastName',
    };

    mockAutService.register.mockResolvedValue({ success: true });

    const response = await controller.register(dto);

    expect(mockAutService.register).toHaveBeenCalledWith(dto);
    expect(response).toEqual({ success: true });
  });

  it('should verify the user', async () => {
    const dto = {
      email: 'test@example.com',
      otp: '123456',
    };

    mockAutService.verify.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    const response = await controller.verify(dto, mockResponse);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockResponse.cookie).toHaveBeenCalledTimes(2);

    expect(mockAutService.verify).toHaveBeenCalledWith(dto);
    expect(response).toEqual({ message: 'Success' });
  });
});
