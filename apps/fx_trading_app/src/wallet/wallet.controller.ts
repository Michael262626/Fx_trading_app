import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { ConvertCurrencyDto } from './dto/convert-currency-dto';
import { TradeDto } from './dto/trade.dto';
import { User } from '../users/user.entities';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('fund')
  async fundWallet(@Body() fundWalletDto: FundWalletDto) {
    await this.walletService.fundWallet(fundWalletDto);
    return { message: 'Wallet funded successfully' };
  }

  @Post('convert')
  async convertCurrency(@Body() convertCurrencyDto: ConvertCurrencyDto) {
    await this.walletService.convertCurrency(convertCurrencyDto);
    return { message: 'Currency converted successfully' };
  }

  @Post('trade')
  async tradeCurrency(@Body() tradeCurrencyDto: TradeDto) {
    await this.walletService.tradeCurrency(tradeCurrencyDto);
    return { message: 'Currency traded successfully' };
  }

  @Get(':userId')
  async getWalletBalances(@Param ('userId') userId: string) {
    return await this.walletService.getWalletBalances(userId);
  }  
}
