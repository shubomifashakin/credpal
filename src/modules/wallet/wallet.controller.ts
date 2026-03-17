import { type Request } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  Body,
  Get,
  Post,
  Req,
  UseGuards,
  Controller,
  UseInterceptors,
} from '@nestjs/common';

import { TradeDto } from './dtos/trade.dto';
import { FundWalletDto } from './dtos/fund-wallet.dto';
import { SwapResponseDto } from './dtos/swap-response.dto';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';
import { FundWalletResponseDto } from './dtos/fund-wallet-response.dto';

import { WalletService } from './wallet.service';
import { AuthGuard } from '../../common/guards/auth-guard/auth-guard.guard';

import { IsIdempotent } from '../../common/decorators/idempotency.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency/idempotency.interceptor';

@Controller('wallets')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletsService: WalletService) {}

  @ApiOperation({ summary: 'Get wallet balances' })
  @ApiResponse({
    status: 200,
    description: 'Wallet balances retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  @Get()
  async getWalletBalances(@Req() req: Request) {
    return this.walletsService.getWalletBalances(req.user.id);
  }

  @ApiOperation({ summary: 'Fund wallet' })
  @ApiResponse({
    status: 201,
    description: 'Wallet funded successfully',
    type: FundWalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found',
  })
  @UseInterceptors(IdempotencyInterceptor)
  @IsIdempotent({ required: true })
  @Post('fund')
  async fund(
    @Req() req: Request,
    @Body() dto: FundWalletDto,
  ): Promise<FundWalletResponseDto> {
    return this.walletsService.fund(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Convert currency' })
  @ApiResponse({
    status: 201,
    description: 'Conversion successful',
    type: SwapResponseDto,
  })
  @Post('convert')
  @UseInterceptors(IdempotencyInterceptor)
  @IsIdempotent({ required: true })
  convert(
    @Req() req: Request,
    @Body() dto: ConvertCurrencyDto,
  ): Promise<SwapResponseDto> {
    return this.walletsService.convert(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Trade currency' })
  @ApiResponse({
    status: 201,
    description: 'Trade successful',
    type: SwapResponseDto,
  })
  @Post('trade')
  @UseInterceptors(IdempotencyInterceptor)
  @IsIdempotent({ required: true })
  trade(@Req() req: Request, @Body() dto: TradeDto): Promise<SwapResponseDto> {
    return this.walletsService.trade(req.user.id, dto);
  }
}
