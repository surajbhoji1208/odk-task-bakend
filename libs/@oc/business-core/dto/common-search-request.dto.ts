import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional } from "class-validator";
import { ValidateEnumType, ValidateType } from "@core-custom-validators";
import { FieldTypeEnum } from "@core-enums";
import { SortDirection } from "libs/@oc/server-core/enums/order-direction.enum";

export class CommonSearchRequestDto {
    @ApiPropertyOptional({
        description: "search text",
        example: ""
    })
    @IsOptional()
    searchText?: string;

    @ValidateType({ constraints: { field: "pageSize", type: FieldTypeEnum.NumberString } })
    @ApiProperty({
        description: "page size",
        example: "10"
    })
    pageSize?: number = 10;

    @ValidateType({ constraints: { field: "pageNumber", type: FieldTypeEnum.NumberString } })
    @ApiProperty({
        description: "page number",
        example: "1"
    })
    pageNumber?: number = 1;

    @ValidateType({ constraints: { field: "sortDirection", type: FieldTypeEnum.String } })
    @ApiProperty({
        description: "sort direction",
        example: "DESC"
    })
    sortDirection?: SortDirection = SortDirection.DESC;
}
