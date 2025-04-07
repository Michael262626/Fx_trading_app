import { Test, TestingModule } from '@nestjs/testing';
import { Transactionservice } from '../src/transaction/transaction.service';
import { ObjectLiteral, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { TransactionType } from '../src/transaction/enum/TransactionStatus.enum';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Wallet } from '../src/wallet/entities/wallet.entities';
import { Transaction } from '../src/transaction/entities/transaction.entities';


type MockRepository<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepo =  <T extends ObjectLiteral = any>(): MockRepository<T> =>  ({
  findOne: jest.fn(),
  createQueryBuilder: jest.fn(),
});

describe('Transactionservice', () => {
  let service: Transactionservice;
  let walletRepo: MockRepository<Wallet> & { findOne: jest.Mock };
  let txRepo: MockRepository<Transaction> & { createQueryBuilder: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Transactionservice,
        {
          provide: getRepositoryToken(Wallet),
          useValue: createMockRepo(),
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get<Transactionservice>(Transactionservice);
    walletRepo = module.get(getRepositoryToken(Wallet));
    txRepo = module.get(getRepositoryToken(Transaction));
  });

  describe('getTransactionHistory', () => {
    it('should throw NotFoundException if wallet not found', async () => {
      walletRepo.findOne.mockResolvedValue(null);

      await expect(service.getTransactionHistory('user1')).rejects.toThrow(NotFoundException);
    });

    it('should return transaction history without type filter', async () => {
      const wallet = { id: 'wallet1' };
      walletRepo.findOne.mockResolvedValue(wallet);

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'tx1' }, { id: 'tx2' }]),
      };
      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactionHistory('user1');
      expect(result).toEqual([{ id: 'tx1' }, { id: 'tx2' }]);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('tx.walletId = :walletId', { walletId: 'wallet1' });
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should return filtered transaction history by type', async () => {
      const wallet = { id: 'wallet1' };
      walletRepo.findOne.mockResolvedValue(wallet);

      const mockQueryBuilder: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 'tx3' }]),
      };
      txRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getTransactionHistory('user1', TransactionType.FUND);
      expect(result).toEqual([{ id: 'tx3' }]);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('tx.type = :type', { type: TransactionType.FUND });
    });
  });
});
