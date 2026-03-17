import { DataSource } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthService } from './auth.service';
import { MailerService } from '../../core/mailer/mailer.service';
import { HasherService } from '../../core/hasher/hasher.service';
import { AppConfigService } from '../../core/app-config/app-config.service';
import { OtpRepository } from '../../core/database/repositories/otp.repository';
import { UserRepository } from '../../core/database/repositories/users.repository';
import { WalletBalanceRepository } from '../../core/database/repositories/wallet-balance.repository';
import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

const hashFn = jest.fn();
const verifyHashFn = jest.fn();

const mockHasherService = {
  hash: hashFn,
  verifyHash: verifyHashFn,
};

const mockUserRepository = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  markVerified: jest.fn(),
};

const mockConfigService = {
  MailFrom: { data: 'test@example.com', success: true },
  NodeEnv: { data: 'development', success: true },
};

const mockWalletBalanceRepo = {
  upsert: jest.fn(),
};

const mockOtpRepo = {
  create: jest.fn(),
  findActiveByUserId: jest.fn(),
  markAsUsed: jest.fn(),
  markVerified: jest.fn(),
};

const mockWalletRepo = {
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
};
const mockMailerSService = {
  sendMail: jest.fn(),
};

const mockConnectFn = jest.fn();
const mockStartTransactionFn = jest.fn();
const mockCommitTransactionFn = jest.fn();
const mockRollbackTransactionFn = jest.fn();
const mockReleaseFn = jest.fn();

const mockDatasource = {
  createQueryRunner: jest.fn().mockReturnValue({
    connect: mockConnectFn,
    startTransaction: mockStartTransactionFn,
    manager: {},
    release: mockReleaseFn,
    commitTransaction: mockCommitTransactionFn,
    rollbackTransaction: mockRollbackTransactionFn,
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: OtpRepository, useValue: mockOtpRepo },
        { provide: WalletBalanceRepository, useValue: mockWalletBalanceRepo },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: WalletRepository, useValue: mockWalletRepo },

        { provide: JwtService, useValue: mockJwtService },
        { provide: MailerService, useValue: mockMailerSService },
        { provide: HasherService, useValue: mockHasherService },
        { provide: AppConfigService, useValue: mockConfigService },
        { provide: DataSource, useValue: mockDatasource },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should should register the user ', async () => {
    mockUserRepository.findByEmail.mockResolvedValue(null);
    mockUserRepository.create.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
    });

    mockOtpRepo.create.mockResolvedValue({
      id: '1',
      userId: '1',
      otp: '123456',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    mockHasherService.hash.mockResolvedValue({
      success: true,
      data: 'hashedPassword',
    });

    mockMailerSService.sendMail.mockResolvedValue({
      success: true,
    });

    const response = await service.register({
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
    });

    expect(response).toHaveProperty('message');
    expect(mockConnectFn).toHaveBeenCalled();
    expect(mockStartTransactionFn).toHaveBeenCalled();
    expect(mockCommitTransactionFn).toHaveBeenCalled();
    expect(mockMailerSService.sendMail).toHaveBeenCalled();
  });

  it('should should not register the user because user with email already exist ', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
    });

    await expect(
      service.register({
        email: 'testemail@email.com',
        firstName: 'FirstName',
        lastName: 'lastname',
        password: 'password1234',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should verify the otp and create user wallet', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
      isVerified: false,
    });

    mockOtpRepo.findActiveByUserId.mockResolvedValue({
      id: '1',
      userId: '1',
      code: '123456',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    mockHasherService.verifyHash.mockResolvedValue({
      success: true,
      data: true,
    });

    mockOtpRepo.markAsUsed.mockResolvedValue(null);
    mockUserRepository.markVerified.mockResolvedValue(null);
    mockWalletRepo.create.mockResolvedValue({
      id: '1',
      userId: '1',
      balance: 0,
      currency: 'NGN',
    });
    mockWalletBalanceRepo.upsert.mockResolvedValue(null);
    mockCommitTransactionFn.mockResolvedValue(null);

    mockJwtService.sign
      .mockReturnValueOnce('accessToken')
      .mockReturnValue('refreshToken');

    const response = await service.verify({
      email: 'testemail@email.com',
      otp: '123456',
    });

    expect(mockCommitTransactionFn).toHaveBeenCalledTimes(1);
    expect(mockReleaseFn).toHaveBeenCalled();
    expect(response).toEqual({
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
    });
  });

  it('should not verify the users account because user has already been verified', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
      isVerified: true,
    });

    await expect(
      service.verify({
        email: 'testemail@email.com',
        otp: '123456',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should not verify the users account because otp has expired', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
      isVerified: false,
    });

    mockOtpRepo.findActiveByUserId.mockResolvedValue({
      id: '1',
      userId: '1',
      code: '123456',
      createdAt: new Date(),
      expiresAt: new Date(100),
    });

    await expect(
      service.verify({
        email: 'testemail@email.com',
        otp: '123456',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should not verify the users accounts because otp sent does not match', async () => {
    mockUserRepository.findByEmail.mockResolvedValue({
      id: '1',
      email: 'testemail@email.com',
      firstName: 'FirstName',
      lastName: 'lastname',
      password: 'password1234',
      isVerified: false,
    });

    mockOtpRepo.findActiveByUserId.mockResolvedValue({
      id: '1',
      userId: '1',
      code: '123456',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() * 1000),
    });

    mockHasherService.verifyHash.mockResolvedValue({
      success: true,
      data: false,
    });

    await expect(
      service.verify({
        email: 'testemail@email.com',
        otp: '123456',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
