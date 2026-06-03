import { ValidateEnumType, ValidateOptional, ValidateType } from "@core-custom-validators";
import { FieldTypeEnum, UserStatus } from "@core-enums";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CommonSearchRequestDto } from "libs/@oc/business-core/dto/common-search-request.dto";

/**
 * DTO for listing users with search, filter, pagination, and sorting.
 * Search: name, email, contact number.
 * Filter: role, userType, status.
 * Sort: name, createdAt.
 */
export class ListUserRequestDto extends CommonSearchRequestDto {

    @ApiPropertyOptional({
        description: "Filter by user status",
        example: UserStatus.ACTIVE,
        enum: UserStatus
    })
    @ValidateOptional()
    @ValidateEnumType({ constraints: { field: 'status', enum: UserStatus } })
    status?: UserStatus;

    @ApiPropertyOptional({
        description: "Filter by role ID",
        example: 1
    })
    @ValidateOptional()
    @ValidateType({ constraints: { field: "role id", type: FieldTypeEnum.NumberString } })
    roleId?: number;
}
