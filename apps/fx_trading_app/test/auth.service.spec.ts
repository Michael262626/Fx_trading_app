import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { EmailService } from '../src/email/email.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/users/user.entities';
import { Repository } from 'typeorm';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../src/auth/dto/register.dto';
import { VerifyOtpDto } from '../src/auth/dto/verify-otp.dto';

// Helper to cast partial User object
const asUser = (user: Partial<User>): User => user as User;

// Create a mock repository
const createMockRepo = (): Partial<jest.Mocked<Repository<User>>> => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let emailService: { sendOtpEmail: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmailService,
          useValue: { sendOtpEmail: jest.fn() },
        },
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepo(),
        },
      ],
    }).compile();

    service = module.get(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    emailService = module.get(EmailService);
  });

  describe('register', () => {
    it('should register a new user and send OTP', async () => {
      const dto: RegisterDto = { name: 'John', email: 'john@example.com', password: 'password123' };

      userRepo.findOne!.mockResolvedValue(null);
      userRepo.create!.mockReturnValue(asUser({ ...dto }));
      userRepo.save!.mockResolvedValue(asUser({ ...dto }));

      jest.spyOn(bcrypt, 'hash').mockImplementation(async () => 'hashed-password');

      const result = await service.register(dto);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { email: dto.email } });
      expect(userRepo.create).toHaveBeenCalledWith({
        name: dto.name,
        email: dto.email,
        password: 'hashed-password',
      });
      expect(userRepo.save).toHaveBeenCalled();
      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(dto.email, expect.any(String));
      expect(result).toEqual({ message: 'User registered successfully. OTP sent to email.' });
    });

    it('should throw ConflictException if user exists', async () => {
      const dto: RegisterDto = { name: 'Jane', email: 'jane@example.com', password: 'pass' };
      userRepo.findOne!.mockResolvedValue(asUser({ id: '1', email: dto.email }));

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('sendOtp', () => {
    it('should generate and send OTP via email', async () => {
      const email = 'test@example.com';
      await service.sendOtp(email);

      expect(emailService.sendOtpEmail).toHaveBeenCalledWith(email, expect.any(String));
    });
  });

  describe('verifyOtp', () => {
    it('should return true for valid OTP', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const user = asUser({
        id: '1',
        name: 'Test',
        email,
        password: 'hashed',
        isVerified: false,
        transactions: [],
        wallets: [],
      });

      userRepo.findOne!.mockResolvedValue(user);
      userRepo.save!.mockResolvedValue({ ...user, isVerified: true } as User);

      const expiry = Date.now() + 5 * 60 * 1000;
      (service as any).otpStore.set(email, { otp, expiry });

      const dto: VerifyOtpDto = { email, otp };
      const result = await service.verifyOtp(dto);

      expect(result).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith({ ...user, isVerified: true });
    });

    it('should return false if OTP is expired', async () => {
      const email = 'test@example.com';
      const otp = '123456';
      const expiredTime = Date.now() - 1000;

      (service as any).otpStore.set(email, { otp, expiry: expiredTime });

      const result = await service.verifyOtp({ email, otp });
      expect(result).toBe(false);
    });

    it('should return false for incorrect OTP', async () => {
      const email = 'test@example.com';
      (service as any).otpStore.set(email, { otp: '999999', expiry: Date.now() + 5000 });

      const result = await service.verifyOtp({ email, otp: '123456' });
      expect(result).toBe(false);
    });
  });
});
