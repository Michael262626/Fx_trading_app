import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsString } from "class-validator";

export class StoredOtp {
    @ApiProperty({ description: 'The OTP code sent to the user' })
    @IsString()
    otp: string;
  
    @ApiProperty()
    @IsNumber()
    expiry: number;
  }
  