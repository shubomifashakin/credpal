/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Repository, EntityManager } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ValidationPipe,
  ShutdownSignal,
  INestApplication,
  BadRequestException,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';

import { AppModule } from './../src/app.module';
import { RedisService } from '../src/core/redis/redis.service';
import { User } from '../src/core/database/entities/users.entity';
import { Wallet } from '../src/core/database/entities/wallets.entity';
import { TypeOrmExceptionFilter } from '../src/common/filters/typeorm-error.filter';
import { WalletBalance } from '../src/core/database/entities/wallet-balances.entity';

const mockJwtService = {
  verifyAsync: jest.fn(),
};

describe('WalletsController (e2e)', () => {
  let app: INestApplication<App>;

  let redisService: RedisService;

  let userRespository: Repository<User>;
  let walletRespository: Repository<Wallet>;
  let walletBalanceRespository: Repository<WalletBalance>;

  async function createUserWithWallet(currency = 'NGN', balance = '0') {
    const user = await userRespository.save(
      userRespository.create({
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      }),
    );

    const wallet = await walletRespository.save(
      walletRespository.create({ userId: user.id }),
    );

    await walletBalanceRespository.save(
      walletBalanceRespository.create({
        walletId: wallet.id,
        currency,
        balance,
      }),
    );

    return { user, wallet };
  }

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtService)
      .useValue(mockJwtService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        stopAtFirstError: true,
        forbidNonWhitelisted: true,
        exceptionFactory: (errors) => {
          const firstError = errors[0];

          let message = 'Invalid Payload';

          if (firstError?.constraints) {
            message = Object.values(firstError.constraints)[0];
          }

          return new BadRequestException(message);
        },
      }),
    );

    app.enableShutdownHooks([ShutdownSignal.SIGINT, ShutdownSignal.SIGTERM]);
    app.useGlobalFilters(new TypeOrmExceptionFilter());
    await app.init();

    redisService = moduleFixture.get(RedisService);

    const entityManager = moduleFixture.get(EntityManager);
    userRespository = entityManager.getRepository(User);
    walletRespository = entityManager.getRepository(Wallet);
    walletBalanceRespository = entityManager.getRepository(WalletBalance);

    jest.clearAllMocks();
    await userRespository.deleteAll();
  });

  afterEach(async () => {
    await userRespository.deleteAll();
    await app.close();
  });

  describe('GET /wallets', () => {
    beforeEach(async () => {
      await redisService.flushAll();
      await userRespository.deleteAll();
      await walletRespository.deleteAll();
      await walletBalanceRespository.deleteAll();
      jest.clearAllMocks();
    });

    it('should return wallet balances', async () => {
      const { user } = await createUserWithWallet();

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/wallets')
        .set('Cookie', [`access_token=${accessToken}`]);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('balances');
      expect(response.body.balances).toHaveLength(1);
      expect(response.body.balances[0]).toHaveProperty('currency', 'NGN');
      expect(response.body.balances[0]).toHaveProperty(
        'balance',
        Number('0').toFixed(8),
      );
    });

    it('should return 404 when wallet not found', async () => {
      const user = userRespository.create({
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      });

      await userRespository.save(user);

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .get('/wallets')
        .set('Cookie', [`access_token=${accessToken}`]);

      expect(response.status).toBe(404);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 when user is not authenticated', async () => {
      const user = userRespository.create({
        email: 'test@example.com',
        password: 'password',
        firstName: 'Test',
        lastName: 'User',
      });

      await userRespository.save(user);

      const response = await request(app.getHttpServer()).get('/wallets');

      expect(response.status).toBe(401);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /wallets/fund', () => {
    beforeEach(async () => {
      await redisService.flushAll();
      await userRespository.deleteAll();
      await walletRespository.deleteAll();
      await walletBalanceRespository.deleteAll();
      jest.clearAllMocks();
    });

    it('should fund wallet', async () => {
      const { user, wallet } = await createUserWithWallet();

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const body = {
        currency: 'NGN',
        amount: 100,
      };
      const response = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('currency', 'NGN');

      const secondRequestResponse = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({ ...body, amount: 700 });

      expect(secondRequestResponse.status).toBe(201);
      expect(secondRequestResponse.body).toBeDefined();
      expect(secondRequestResponse.body).toHaveProperty('message');
      expect(secondRequestResponse.body).toHaveProperty('currency', 'NGN');

      const balance = await walletBalanceRespository.findOneBy({
        walletId: wallet.id,
      });
      expect(balance).toBeDefined();
      expect(balance?.balance).toBe(body.amount.toFixed(8));
    });

    it('should not fund wallet if idempotency key header does not exist', async () => {
      const { user } = await createUserWithWallet();

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Cookie', [`access_token=${accessToken}`])
        .send({
          currency: 'NGN',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when amount is invalid', async () => {
      const { user } = await createUserWithWallet();

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({
          currency: 'NGN',
          amount: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 when currency is invalid', async () => {
      const { user } = await createUserWithWallet();

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/wallets/fund')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({
          currency: 'CAD',
          amount: 100,
        });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /wallets/convert', () => {
    const mockFetch = jest.fn();
    const rates = {
      NGN: 1,
      USD: 0.00063,
      EUR: 0.00058,
      GBP: 0.00049,
    };

    beforeEach(async () => {
      await redisService.flushAll();
      await userRespository.deleteAll();
      jest.clearAllMocks();
      global.fetch = mockFetch;

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          result: 'success',
          conversion_rates: rates,
        }),
      });
    });

    it('should convert amount', async () => {
      const { user, wallet } = await createUserWithWallet(undefined, '500');

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/wallets/convert')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({
          fromCurrency: 'NGN',
          amount: 100,
          toCurrency: 'USD',
        });

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('rate');
      expect(response.body.rate).toEqual(rates.USD);

      const secondRequestResponse = await request(app.getHttpServer())
        .post('/wallets/convert')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({
          fromCurrency: 'NGN',
          amount: 200,
          toCurrency: 'USD',
        });

      expect(secondRequestResponse.status).toBe(201);
      expect(secondRequestResponse.body).toBeDefined();
      expect(secondRequestResponse.body).toHaveProperty('message');

      const balance = await walletBalanceRespository.findOneBy({
        walletId: wallet.id,
        currency: 'NGN',
      });

      expect(balance).toBeDefined();
      expect(balance?.balance).toBe(Number(400).toFixed(8));
    });

    it('should not convert amount if user does not have sufficient funds', async () => {
      const { user } = await createUserWithWallet(undefined, '100');

      const accessToken = 'test-access_token';

      mockJwtService.verifyAsync.mockResolvedValue({
        jti: 'test-jti',
        sub: user.id,
      });

      const response = await request(app.getHttpServer())
        .post('/wallets/convert')
        .set('Cookie', [`access_token=${accessToken}`])
        .set('x-idempotency-key', 'test-idempotency-key')
        .send({
          fromCurrency: 'NGN',
          amount: 800,
          toCurrency: 'USD',
        });

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('message');
    });
  });
});
