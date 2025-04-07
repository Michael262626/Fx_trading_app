import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConvertCurrencyDto {
  @ApiProperty({ description: 'The ID of the user requesting the conversion' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'The currency code to convert from (e.g., USD)' })
  @IsString()
  from: string;

  @ApiProperty({ description: 'The currency code to convert to (e.g., EUR)' })
  @IsString()
  to: string;

  @ApiProperty({ description: 'The amount to convert'})
  @IsNumber({}, { message: 'Amount must be a number' })
  amount: number;
}
