import { ApiProperty } from "@nestjs/swagger";

export class CommonSearchResponseDto<T = any> {
    /**
     * Constructor for CommonSearchResponseDTO
     * @param result - The result of the search query
     * @param pageSize - The number of records per page
     * @param page - The current page number
     * @param resultCount - The total number of records for the search query
     */
    constructor(result: T[], pageSize: number, page: number, resultCount: number) {
        this.results = result;
        this.page = page;
        this.pageSize = pageSize;
        this.totalCount = resultCount;
    }

    @ApiProperty({
        description: "The result of the search query",
        type: () => Object, // placeholder
        isArray: true
    })
    results: T[];

    @ApiProperty({
        description: "The number of records per page",
        example: 10
    })
    pageSize: number;

    @ApiProperty({
        description: "The current page number",
        example: 1
    })
    page: number;

    @ApiProperty({
        description: "The total number of records for the search query",
        example: 100
    })
    totalCount: number;
}

/*
  ===============================================: EXAMPLE :======================================================

   // For typed response (recommended)
   const response = new CommonSearchResponseDto<UserResponseDto>(
       users,
       request.pageSize,
       request.pageNumber,
       total
   );

   // For untyped response (fallback)
   const response = new CommonSearchResponseDto(
       users,
       request.pageSize,
       request.pageNumber,
       total
   );

   return new AppResponse(SuccessConstant.ListFetch, response, { module: "User" });

  ===============================================: EXAMPLE :======================================================
  */
