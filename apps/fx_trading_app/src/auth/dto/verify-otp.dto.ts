import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class VerifyOtpDto {
    @ApiProperty({ description: 'The OTP code sent to the user' })
    @IsString()
    otp: string;
  
    @ApiProperty({ description: 'User email address to verify' })
    @IsString()
    email: string;
  }
  