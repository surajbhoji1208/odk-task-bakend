import { User } from "@core-database";
import { ApiProperty } from "@nestjs/swagger";





/**
 * Response DTO for user data
 */
export class UserResponseDto {
    /**
     * Constructor to map User entity to response DTO
     * @param user - User entity from repository
     */
    constructor(user: User) {
        // Map core fields
        this.uuid = user.uuid;
        this.id = user.id;
        this.fullName = user.fullName;
        this.email = user.email;
        this.createdAt = user.createdAt;
        this.updatedAt = user.updatedAt;
    }

    @ApiProperty({
        description: "User's unique identifier",
        example: "123e4567-e89b-12d3-a456-426614174000"
    })
    uuid: string;

    @ApiProperty({
        description: "User's integer ID",
        example: 1
    })
    id: number;

    @ApiProperty({
        description: "User's full name",
        example: "John Doe"
    })
    fullName: string;

    @ApiProperty({
        description: "User's email address",
        example: "john.doe@example.com"
    })
    email: string;

    @ApiProperty({
        description: "Account creation timestamp",
        example: "2023-01-01T00:00:00.000Z"
    })
    createdAt: Date;

    @ApiProperty({
        description: "Account last update timestamp",
        example: "2023-01-01T00:00:00.000Z"
    })
    updatedAt: Date;
}
