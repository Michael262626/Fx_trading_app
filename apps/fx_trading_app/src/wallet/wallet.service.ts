import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, Repository } from "typeorm";
import { Wallet } from "./entities/wallet.entities";
import { WalletBalance } from "./entities/wallet-balance.entities";
import { Transaction } from "../transaction/entities/transaction.entities";
import { FundWalletDto } from "./dto/fund-wallet.dto";
import { TradeDto } from "./dto/trade.dto";
import { TransactionStatus, TransactionType } from "../transaction/enum/TransactionStatus.enum";
import { FxService } from "../fx/fx.service"; // Assuming the fx service is located here
import { IdempotencyService } from "./idempotency.service";
import { User } from "../users/user.entities";
import { ConvertCurrencyDto } from "./dto/convert-currency-dto";

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,

    @InjectRepository(WalletBalance)
    private balanceRepo: Repository<WalletBalance>,

    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
    
    @InjectRepository(User)
    private userRepo: Repository<User>,
    
    @Inject(IdempotencyService)
    private idempotencyService: IdempotencyService,

    private fxService: FxService, // Inject fxService
  ) {}

  async fundWallet(dto: FundWalletDto) {
    return this.idempotencyService.checkOrSave(dto.idempotencyKey, async () => {
      const user = await this.userRepo.findOne({
        where: { id: dto.userId },
        relations: ['wallets'],
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const wallet = user.wallets[0];
  
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
  
      wallet[dto.currency] += dto.amount;
  
      await this.walletRepo.save(wallet);
  
      const tx = this.txRepo.create({
        wallet,
        currency: dto.currency,
        amount: dto.amount,
        type: 'FUND',
        status: 'SUCCESS',
        rateUsed: 1,
      }as DeepPartial<Transaction>);
  
      await this.txRepo.save(tx);
  
      return { message: 'Wallet funded successfully.' };
    });
  }
  
  async convertCurrency(dto: ConvertCurrencyDto) {
    if (dto.from === dto.to)
      throw new BadRequestException('Cannot convert to same currency');

    const wallet = await this.walletRepo.findOne({
      where: { user: { id: dto.userId } },
      relations: ['user'],
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const fromBalance = await this.balanceRepo.findOneBy({
      wallet: { id: wallet.id },
      currency: dto.from,
    });

    if (!fromBalance || Number(fromBalance.amount) < dto.amount)
      throw new BadRequestException('Insufficient balance');

    const rate = await this.fxService.getRate(dto.from, dto.to);
    const convertedAmount = dto.amount * rate;

    fromBalance.amount = Number(fromBalance.amount) - dto.amount;
    await this.balanceRepo.save(fromBalance);

    let toBalance = await this.balanceRepo.findOneBy({
      wallet: { id: wallet.id },
      currency: dto.to,
    });

    if (!toBalance) {
      toBalance = this.balanceRepo.create({
        wallet: wallet, // Corrected wallet assignment
        currency: dto.to,
        amount: convertedAmount,
      });
    } else {
      toBalance.amount = Number(toBalance.amount) + convertedAmount;
    }

    await this.balanceRepo.save(toBalance);

    await this.txRepo.save([
      this.txRepo.create({
        wallet,
        currency: dto.from,
        amount: dto.amount,
        type: 'CONVERSION',
        status: 'SUCCESS',
        description: `Converted ${dto.amount} ${dto.from} to ${convertedAmount} ${dto.to}`,
      }as DeepPartial<Transaction>),
      this.txRepo.create({
        wallet,
        currency: dto.to,
        amount: convertedAmount,
        type: 'CONVERSION',
        status: 'SUCCESS',
        description: `Received ${convertedAmount} ${dto.to} from ${dto.amount} ${dto.from}`,
      }as DeepPartial<Transaction>),
    ]);

    return {
      message: `Converted ${dto.amount} ${dto.from} to ${convertedAmount.toFixed(2)} ${dto.to}`,
      rate,
      newBalances: {
        [dto.from]: fromBalance.amount,
        [dto.to]: toBalance.amount,
      },
    };
  }

  async tradeCurrency(dto: TradeDto): Promise<Transaction[]> {
    const { fromCurrency, toCurrency, amount } = dto;
  
    if (fromCurrency === toCurrency)
      throw new BadRequestException('Cannot trade same currency');
  
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: dto.userId } },
      relations: ['user'],
    });
  
    if (!wallet) throw new NotFoundException('Wallet not found');
  
    const fxRate = await this.fxService.getRate(fromCurrency, toCurrency);
    const toAmount = amount * fxRate;
  
    const fromBalance = wallet.balance[fromCurrency] || 0;
    const toBalance = wallet.balance[toCurrency] || 0;
  
    if (fromBalance < amount) {
      throw new BadRequestException('Insufficient funds for trade');
    }
  
    // Update balances
    wallet.balance[fromCurrency] = fromBalance - amount;
    wallet.balance[toCurrency] = toBalance + toAmount;
  
    const debitTx = this.txRepo.create({
      wallet,
      currency: fromCurrency,
      amount,
      type: TransactionType.TRADE,
      status: TransactionStatus.SUCCESS,
      description: `Traded ${amount} ${fromCurrency} to ${toCurrency} at rate ${fxRate}`,
    });
  
    const creditTx = this.txRepo.create({
      wallet,
      currency: toCurrency,
      amount: toAmount,
      type: TransactionType.TRADE,
      status: TransactionStatus.SUCCESS,
      description: `Received ${toAmount.toFixed(2)} ${toCurrency} from ${amount} ${fromCurrency}`,
    });
  
    await this.walletRepo.save(wallet);
    await this.txRepo.save([debitTx, creditTx]);
  
    return [debitTx, creditTx];
  }

  async getWalletBalances(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['wallets'],
    });
  
    if (!user || !user.wallets?.length) {
      throw new NotFoundException('User or wallets not found');
    }
  
    const aggregatedBalances: Record<string, number> = {};
  
    for (const wallet of user.wallets) {
      for (const [currency, amount] of Object.entries(wallet.balance || {})) {
        if (!aggregatedBalances[currency]) {
          aggregatedBalances[currency] = 0;
        }
        aggregatedBalances[currency] += amount;
      }
    }
  
    return aggregatedBalances;
  }
  
  
}
