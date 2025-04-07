import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './wallet/entities/wallet.entities';
import { Transaction } from './transaction/entities/transaction.entities';
import { User } from './users/user.entities';
import { WalletService } from './wallet/wallet.service';
import { Transactionservice } from './transaction/transaction.service';
import { AuthService } from './auth/auth.service';
import { EmailService } from './email/email.service';
import { WalletController } from './wallet/wallet.controller';
import { AuthController } from './auth/auth.controller';
import { TransactionController } from './transaction/transaction.controller';
import { FxController } from './fx/fx.controller';
import { FxService } from './fx/fx.service';
import { WalletBalance } from './wallet/entities/wallet-balance.entities';
import { IdempotencyRecord } from './wallet/entities/idempotency.entities';
import { IdempotencyService } from './wallet/idempotency.service';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    CacheModule.register({
      store: redisStore,
      host: process.env.REDIS_HOST,  // Add REDIS_HOST to .env
      port: 6379, // Add REDIS_PORT to .env
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: 5432,
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      entities: [Wallet, Transaction, User, WalletBalance, IdempotencyRecord],
      synchronize: true,
      logging: false,  // Enable logging for SQL queries
    }),
    TypeOrmModule.forFeature([Wallet, Transaction, User, WalletBalance, IdempotencyRecord]),
  ],
  controllers: [WalletController, AuthController, TransactionController, FxController],
  providers: [
    WalletService,
    Transactionservice,
    IdempotencyService,
    AuthService,
    EmailService,
    FxService,
  ],
})
export class AppModule {}
