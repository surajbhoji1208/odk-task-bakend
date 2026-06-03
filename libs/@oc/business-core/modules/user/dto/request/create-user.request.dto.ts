import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserDto {
    @ApiProperty({ description: "User's full name", example: "John Doe" })
    @IsNotEmpty()
    @IsString()
    fullName: string;

    @ApiProperty({ description: "User's email address", example: "john.doe@example.com" })
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ description: "User's phone number", example: "1234567890" })
    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @ApiPropertyOptional({ description: "User's password (optional during simple create)", example: "Password123" })
    @IsOptional()
    @IsString()
    password?: string;
}
