import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { SupportedCurrency } from '../enum/SupportedCurrency.enum';

export class TradeDto {
  @ApiProperty({ description: 'The user ID initiating the trade' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ enum: SupportedCurrency, description: 'The currency to trade from' })
  @IsEnum(SupportedCurrency)
  @IsNotEmpty()
  fromCurrency: SupportedCurrency;

  @ApiProperty({ enum: SupportedCurrency, description: 'The currency to trade to' })
  @IsEnum(SupportedCurrency)
  @IsNotEmpty()
  toCurrency: SupportedCurrency;

  @ApiProperty({ description: 'The amount in fromCurrency', example: 100 })
  @IsNumber()
  @Min(1)
  amount: number;
}
