import {
  Get,
  Query,
  UseGuards,
  Controller,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

import { FxService } from './fx.service';
import { FxRatesResultDto } from './dtos/get-rates-response.dto';

import {
  SupportedCurrency,
  SUPPORTED_CURRENCIES,
} from '../../common/constants';
import { AuthGuard } from '../../common/guards/auth-guard/auth-guard.guard';

@Controller('fx')
@UseGuards(AuthGuard)
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @ApiOperation({ summary: 'Get current FX rates' })
  @ApiQuery({
    name: 'currency',
    required: false,
    enum: SUPPORTED_CURRENCIES,
    description: 'Base currency, defaults to NGN',
  })
  @ApiResponse({
    status: 200,
    description: 'FX rates returned',
    type: FxRatesResultDto,
  })
  @Get('rates')
  async getRates(
    @Query('currency') currency: string,
  ): Promise<FxRatesResultDto> {
    if (
      currency &&
      !SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
    ) {
      throw new BadRequestException(`Unsupported currency: ${currency}`);
    }

    return this.fxService.getRates(currency || 'NGN');
  }
}
