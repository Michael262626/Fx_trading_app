import { Controller, Get, Param, Query } from '@nestjs/common';
import { Transactionservice } from './transaction.service';
import { TransactionType } from './enum/TransactionStatus.enum';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: Transactionservice) {}

  @Get(':userId')
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query('type') type?: TransactionType,
  ) {
    const transactions = await this.transactionService.getTransactionHistory(userId, type);
    return {
      message: 'Transaction history retrieved successfully',
      data: transactions,
    };
  }
}
