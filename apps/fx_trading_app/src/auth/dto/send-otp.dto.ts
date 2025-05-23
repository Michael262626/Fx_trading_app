import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty } from "class-validator";

export class SendOtpDto {
    @ApiProperty({ description: 'Email address of the user' })
    @IsEmail()
    @IsNotEmpty() 
    email: string;
}