import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_PASSWORD');
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });
  }
  

  // Send OTP email
  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const mailOptions = {
      from: this.configService.get<string>('GMAIL_USER'),
      to: to,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}. Please use this to complete your registration.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`OTP sent to ${to}`);
    } catch (error) {
      console.error('Error sending OTP email', error);
      throw new Error('Failed to send OTP email');
    }
  }
}
