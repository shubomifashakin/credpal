import { type Response } from 'express';
import { Body, Controller, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { VerifyDto } from './dtos/verify.dto';
import { RegisterDto } from './dtos/register.dto';
import { AppConfigService } from '../../core/app-config/app-config.service';

import { TOKEN } from '../../common/constants';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: AppConfigService,
  ) {}

  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with email and password',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, invalid input data',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict, user already exists',
  })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @ApiOperation({
    summary: 'Verify user account',
    description: 'Verifies a user account using email and OTP',
  })
  @ApiResponse({
    status: 201,
    description: 'User verified successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request, invalid input data',
  })
  @ApiResponse({
    status: 404,
    description: 'Not found, user not found',
  })
  @Post('verify')
  async verify(
    @Body() dto: VerifyDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const serviceRes = await this.authService.verify(dto);
    const isProduction = this.configService.NodeEnv.data === 'production';

    res.cookie('access_token', serviceRes.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: TOKEN.ACCESS.EXPIRATION_MS,
    });

    res.cookie('refresh_token', serviceRes.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: TOKEN.REFRESH.EXPIRATION_MS,
    });

    return { message: 'Success' };
  }
}
