import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionType } from './enum/TransactionStatus.enum';
import { Transaction } from './entities/transaction.entities';
import { Wallet } from '../wallet/entities/wallet.entities';

@Injectable()
export class Transactionservice {
  constructor(
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,

    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  // Fetch transaction history for a user
  async getTransactionHistory(userId: string, type?: TransactionType): Promise<Transaction[]> {
    const wallet = await this.walletRepo.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
  
    if (!wallet) throw new NotFoundException('Wallet not found');
  
    const query = this.txRepo
      .createQueryBuilder('tx')
      .where('tx.walletId = :walletId', { walletId: wallet.id });
  
    if (type !== undefined) {
      query.andWhere('tx.type = :type', { type });
    }
  
    return query.orderBy('tx.createdAt', 'DESC').getMany();
  }  
}
