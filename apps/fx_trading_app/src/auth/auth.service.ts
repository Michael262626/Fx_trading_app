import { ConflictException, Injectable } from '@nestjs/common';
import {  VerifyOtpDto } from './dto/verify-otp.dto';
import { EmailService } from '../email/email.service';
import { randomInt } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entities';
import { StoredOtp } from './dto/StoredOtp.dto';

@Injectable()
export class AuthService {
  private otpStore: Map<string, StoredOtp> = new Map();

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}
  
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    const { name, email, password } = registerDto;

    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      name,
      email,
      password: hashedPassword,
    });

    await this.userRepo.save(user);
    await this.sendOtp(email);

    return { message: 'User registered successfully. OTP sent to email.' };
  }

  // Generate and send OTP to the user
  async sendOtp(email: string): Promise<void> {
    const otp = randomInt(100000, 999999).toString(); 
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    const storedOtp: StoredOtp = { otp, expiry: otpExpiry };
    this.otpStore.set(email, storedOtp); 
    await this.emailService.sendOtpEmail(email, otp); 
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<boolean> {
    const { otp, email } = verifyOtpDto;
    const storedOtp = this.otpStore.get(email);

    if (storedOtp) {
      if (storedOtp.expiry < Date.now()) {
        this.otpStore.delete(email);
        return false;
      }
  
      if (storedOtp.otp === otp) {
        this.otpStore.delete(email);
  
        const user = await this.userRepo.findOne({ where: { email } });
        if (user) {
          user.isVerified = true;
          await this.userRepo.save(user);
        }
  
        return true;
      }
    }
  
    return false;
  }
  
  
}
