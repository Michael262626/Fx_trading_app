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
import { CreateWalletDto } from "./dto/create-wallet.dto";
import { SupportedCurrency } from "./enum/SupportedCurrency.enum";

@Injectable()
export class WalletService {
  constructor(

    @InjectRepository(WalletBalance)
    private walletBalanceRepo: Repository<WalletBalance>,

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

    private fxService: FxService,
  ) {}

  async fundWallet(dto: FundWalletDto) {
    return this.idempotencyService.checkOrSave(dto.idempotencyKey, async () => {
      const user = await this.userRepo.findOne({
        where: { id: dto.userId },
        relations: ['wallets'],
      });
  
      if (!user) throw new NotFoundException('User not found');
  
      // Get the first wallet (or select the relevant one)
      const wallet = user.wallets[0];  // Assuming user has at least one wallet
      if (!wallet) throw new NotFoundException('Wallet not found');
  
      // Check if the wallet balance exists for the given currency
      let walletBalance = await this.walletBalanceRepo.findOne({
        where: { wallet: { id: wallet.id }, currency: dto.currency },
      });
  
      // If no balance exists for that currency, create a new one
      if (!walletBalance) {
        walletBalance = this.walletBalanceRepo.create({
          wallet,
          currency: dto.currency,
          amount: 0,
        });
      }
  
      // Update the balance for the given currency
      walletBalance.amount += dto.amount;
  
      // Save the updated wallet balance
      await this.walletBalanceRepo.save(walletBalance);
  
      // Create the transaction for this fund operation
      const tx = this.txRepo.create({
        wallet,
        currency: dto.currency,
        amount: dto.amount,
        type: 'FUND',
        status: 'SUCCESS',
        rateUsed: 1,
      } as DeepPartial<Transaction>);
  
      // Save the transaction to the database
      await this.txRepo.save(tx);
  
      return { message: 'Wallet funded successfully.' };
    });
  }
  
    

  async createWallet(dto: CreateWalletDto): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id: dto.userId },
      relations: ['wallets'],
    });
  
    if (!user) {
      throw new NotFoundException('User not found');
    }
  
    const existingWallet = await this.walletRepo.findOne({
      where: { user: { id: dto.userId } },
    });
  
    if (existingWallet) {
      throw new BadRequestException('Wallet already exists for user');
    }
  
    const newWallet = this.walletRepo.create({
      user,
      currency: dto.currency,
      balances: {},
    });
  
    await this.walletRepo.save(newWallet);
  
    const initialCurrencies: SupportedCurrency[] = [
      SupportedCurrency.USD,
      SupportedCurrency.NGN,
      SupportedCurrency.EUR,
    ];
      
    const balances = initialCurrencies.map((currency) =>
      this.balanceRepo.create({
        wallet: newWallet,
        currency,
        amount: 0,
      })
    );
  
    await this.balanceRepo.save(balances);
  
    return { message: 'Wallet created successfully with initial currencies.' };
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
  
    const fromBalance = wallet.balances[fromCurrency] || 0;
    const toBalance = wallet.balances[toCurrency] || 0;
  
    if (fromBalance < amount) {
      throw new BadRequestException('Insufficient funds for trade');
    }
  
    // Update balances
    wallet.balances[fromCurrency] = fromBalance - amount;
    wallet.balances[toCurrency] = toBalance + toAmount;
  
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
    const walletBalances = await this.walletBalanceRepo.find({
      where: { wallet: { id: wallet.id } },
    });

    for (const walletBalance of walletBalances) {
      if (!aggregatedBalances[walletBalance.currency]) {
        aggregatedBalances[walletBalance.currency] = 0;
      }
      aggregatedBalances[walletBalance.currency] += walletBalance.amount;
    }
  }

  return aggregatedBalances;
}
}
