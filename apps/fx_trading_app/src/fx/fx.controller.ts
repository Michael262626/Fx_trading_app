import { Controller, Get, Query } from '@nestjs/common';
import { FxService } from './fx.service';

@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rate')
  async getExchangeRate(
    @Query('from') from: string,
    @Query('to') to: string
  ) {
    if (!from || !to) {
      return { message: 'Missing required query parameters: from, to' };
    }

    const rate = await this.fxService.getRate(from.toUpperCase(), to.toUpperCase());

    return {
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate,
    };
  }
}
