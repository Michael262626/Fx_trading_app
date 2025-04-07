import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class CreateWalletDto {
    @ApiProperty({ description: 'The user ID creating the wallet' })
    @IsUUID()
    userId: string;
    @IsString()
    @ApiProperty({ description: 'currency' })
    currency: string;
  }
  