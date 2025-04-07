import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto } from './dto/send-otp.dto';

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto) {
    await this.authService.sendOtp(body.email);
    return { message: 'OTP sent to your email.' };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const isVerified = await this.authService.verifyOtp(verifyOtpDto);
    if (isVerified) {
      return { message: 'OTP verified successfully.' };
    }
    return { message: 'Invalid OTP or expired.' };
  }
}
