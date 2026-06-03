import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString } from "class-validator";

export class UpdateUserDto {
    @ApiPropertyOptional({ description: "User's full name", example: "John Doe" })
    @IsOptional()
    @IsString()
    fullName?: string;

    @ApiPropertyOptional({ description: "User's email address", example: "john.doe@example.com" })
    @IsOptional()
    @IsEmail()
    email?: string;

    @ApiPropertyOptional({ description: "User's phone number", example: "1234567890" })
    @IsOptional()
    @IsString()
    phoneNumber?: string;
}
