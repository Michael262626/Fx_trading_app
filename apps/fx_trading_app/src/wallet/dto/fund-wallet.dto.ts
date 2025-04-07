import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FundWalletDto {
  @ApiProperty({ description: 'The user ID funding the wallet' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'The currency to fund with (e.g., USD)' })
  @IsString()
  @IsNotEmpty()
  currency: string;

  @ApiProperty({ description: 'The amount to fund', example: 100 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ description: 'A unique idempotency key to prevent duplicate transactions' })
  @IsUUID()
  @IsNotEmpty()
  idempotencyKey: string;
}
