import { randomInt } from 'crypto';
import { DataSource } from 'typeorm';

import { JwtService } from '@nestjs/jwt';
import {
  Logger,
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

import { VerifyDto } from './dtos/verify.dto';
import { RegisterDto } from './dtos/register.dto';
import { VerifyResponseDto } from './dtos/verify-response.dto';

import { MINUTES_10_MS, TOKEN } from '../../common/constants';
import { HasherService } from '../../core/hasher/hasher.service';
import { MailerService } from '../../core/mailer/mailer.service';
import { AppConfigService } from '../../core/app-config/app-config.service';
import { OtpRepository } from '../../core/database/repositories/otp.repository';
import { UserRepository } from '../../core/database/repositories/users.repository';
import { WalletRepository } from '../../core/database/repositories/wallet.repository';
import { WalletBalanceRepository } from '../../core/database/repositories/wallet-balance.repository';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly otpRepository: OtpRepository,
    private readonly walletsRepository: WalletRepository,
    private readonly walletBalanceRepository: WalletBalanceRepository,

    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly hasherService: HasherService,
    private readonly userRepository: UserRepository,
    private readonly configService: AppConfigService,

    private readonly datasource: DataSource,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 999999).toString();
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    if (existingUser) {
      throw new ConflictException('User already exists');
    }
    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let plainOtp: string;

    try {
      const hashedPassword = await this.hasherService.hash(dto.password);

      if (!hashedPassword.success) {
        this.logger.error({
          message: 'Failed to hash password',
          error: hashedPassword.error,
        });
        throw new InternalServerErrorException();
      }

      const queryManager = queryRunner.manager;

      const user = await this.userRepository.create(
        {
          role: dto.role,
          email: dto.email,
          lastName: dto.lastName,
          firstName: dto.firstName,
          password: hashedPassword.data,
        },
        queryManager,
      );

      plainOtp = this.generateOtp();
      const expiresAt = new Date(Date.now() + MINUTES_10_MS);
      const otpHash = await this.hasherService.hash(plainOtp);

      if (!otpHash.success) {
        this.logger.error({
          message: 'Failed to hash otp',
          error: otpHash.error,
        });
        throw new InternalServerErrorException();
      }

      await this.otpRepository.create(
        { userId: user.id, code: otpHash.data, expiresAt },
        queryManager,
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const mailResponse = await this.mailerService.sendMail({
      receiver: dto.email,
      subject: 'Verify your account',
      html: `<p>Your OTP: <strong>${plainOtp}</strong>. Expires in 10 minutes.</p>`,
      sender: this.configService.MailFrom.data!,
    });

    if (!mailResponse.success) {
      this.logger.error({
        message: 'Failed to send verification email',
        error: mailResponse.error,
      });
    }

    return {
      message: 'Registration successful. Check your email for your OTP.',
    };
  }

  async verify(dto: VerifyDto): Promise<VerifyResponseDto> {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.isVerified) {
      throw new BadRequestException('Account already verified');
    }

    const otp = await this.otpRepository.findActiveByUserId(user.id);

    if (!otp) {
      throw new BadRequestException(
        'No active OTP found. Please register again.',
      );
    }

    if (new Date() > otp.expiresAt) {
      await this.otpRepository.markAsUsed(otp.id);
      throw new BadRequestException('OTP has expired. Please register again.');
    }

    const otpMatch = await this.hasherService.verifyHash(dto.otp, otp.code);

    if (!otpMatch.success) {
      this.logger.error({
        message: 'Failed to verify OTP',
        otp: dto.otp,
        otpId: otp.id,
        error: otpMatch.error,
      });

      throw new UnauthorizedException('Invalid OTP');
    }

    if (!otpMatch.data) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const queryManager = queryRunner.manager;

      await this.otpRepository.markAsUsed(otp.id, queryManager);
      await this.userRepository.markVerified(user.id, queryManager);

      const wallet = await this.walletsRepository.create(user.id, queryManager);

      await this.walletBalanceRepository.upsert(wallet.id, 'NGN', queryManager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const payload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: TOKEN.ACCESS.EXPIRATION,
      algorithm: 'RS256',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: TOKEN.REFRESH.EXPIRATION,
      algorithm: 'RS256',
    });

    return { accessToken, refreshToken };
  }
}
