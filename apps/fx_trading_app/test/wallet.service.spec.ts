import { Test, TestingModule } from '@nestjs/testing';
import { Repository, ObjectLiteral, Transaction } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WalletService } from '../src/wallet/wallet.service';
import { Wallet } from '../src/wallet/entities/wallet.entities';
import { WalletBalance } from '../src/wallet/entities/wallet-balance.entities';
import { User } from '../src/users/user.entities';
import { IdempotencyService } from '../src/wallet/idempotency.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FxService } from '../src/fx/fx.service';

type MockRepository<T extends Record<string, any> = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T extends ObjectLiteral = any>(): MockRepository<T> => ({
    findOne: jest.fn(),
  findOneBy: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
});

const mockIdempotencyService = {
  checkOrSave: jest.fn(),
};

const mockFxService = {
  getRate: jest.fn(),
};

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: MockRepository<Wallet>;
  let balanceRepo: MockRepository<WalletBalance>;
  let txRepo: MockRepository<any>;
  let userRepo: MockRepository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: FxService, useValue: mockFxService },
        { provide: IdempotencyService, useValue: mockIdempotencyService },
        { provide: getRepositoryToken(Wallet), useValue: createMockRepository<Wallet>() },
        { provide: getRepositoryToken(WalletBalance), useValue: createMockRepository<WalletBalance>() },
        { provide: getRepositoryToken(User), useValue: createMockRepository<User>() },
        { provide: getRepositoryToken(Transaction), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    walletRepo = module.get(getRepositoryToken(Wallet));
    balanceRepo = module.get(getRepositoryToken(WalletBalance));
    txRepo = module.get(getRepositoryToken(Transaction));
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('createWallet', () => {
    it('should throw if user not found', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createWallet({ userId: '123', currency: 'USD' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if wallet already exists', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue({ id: '123', wallets: [] });
      (walletRepo.findOne as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.createWallet({ userId: '123', currency: 'USD' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create wallet and balances', async () => {
      const user = { id: '123', wallets: [] };
      (userRepo.findOne as jest.Mock).mockResolvedValue(user);
      (walletRepo.findOne as jest.Mock).mockResolvedValue(null);

      const wallet = { id: 'wallet1' };
      (walletRepo.create as jest.Mock).mockReturnValue(wallet);
      (walletRepo.save as jest.Mock).mockResolvedValue(wallet);

      (balanceRepo.create as jest.Mock).mockImplementation((input) => input);
      (balanceRepo.save as jest.Mock).mockResolvedValue(true);

      const result = await service.createWallet({ userId: '123', currency: 'USD' });
      expect(result.message).toEqual('Wallet created successfully with initial currencies.');
    });
  });

  describe('fundWallet', () => {
    it('should throw if user not found', async () => {
      (userRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.fundWallet({
          userId: 'user1',
          amount: 100,
          currency: 'USD',
          idempotencyKey: 'key123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should fund wallet and create transaction', async () => {
      const mockWallet = { id: 'wallet1' };
      const mockUser = { id: 'user1', wallets: [mockWallet] };

      (userRepo.findOne as jest.Mock).mockResolvedValue(mockUser);
      (balanceRepo.findOne as jest.Mock).mockResolvedValue(null);
      (balanceRepo.create as jest.Mock).mockReturnValue({ amount: 0 });
      (balanceRepo.save as jest.Mock).mockResolvedValue(true);
      (txRepo.create as jest.Mock).mockReturnValue({});
      (txRepo.save as jest.Mock).mockResolvedValue(true);
      (mockIdempotencyService.checkOrSave as jest.Mock).mockImplementation((_key, fn) => fn());

      const res = await service.fundWallet({
        userId: 'user1',
        amount: 100,
        currency: 'USD',
        idempotencyKey: 'unique-key',
      });

      expect(res.message).toEqual('Wallet funded successfully.');
    });
  });
});
