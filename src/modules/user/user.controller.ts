import { AppResponse, CommonSearchResponseDto } from "@business-core-dto";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query } from "@nestjs/common";
import { UserService } from "libs/@oc/business-core/modules/user/user.service";
import { CreateUserDto, ListUserRequestDto, UpdateUserDto } from "libs/@oc/business-core/modules/user/dto/request";
import { UserResponseDto } from "libs/@oc/business-core/modules/user/dto/response";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { User } from "@core-database";
import { CurrentUser } from "libs/@oc/server-core/custom-guards";

@ApiTags("User")
@Controller("user")
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    @ApiOperation({ summary: "Create a new user" })
    async create(@Body() createRequest: CreateUserDto): Promise<AppResponse<UserResponseDto>> {
        return this.userService.create(createRequest);
    }

    @Get()
    @ApiOperation({ summary: "Get a paginated list of users" })
    async findAll(
        @Query() searchRequest: ListUserRequestDto,
        @CurrentUser() user: User
    ): Promise<AppResponse<CommonSearchResponseDto<UserResponseDto>>> {
        return this.userService.findList(searchRequest, user);
    }

    @Get(":id")
    @ApiOperation({ summary: "Get a user by ID" })
    async findOne(@Param("id", ParseIntPipe) id: number): Promise<AppResponse<UserResponseDto>> {
        return this.userService.findOne(id);
    }

    @Put(":id")
    @ApiOperation({ summary: "Update a user by ID" })
    async update(
        @Param("id", ParseIntPipe) id: number,
        @Body() updateRequest: UpdateUserDto
    ): Promise<AppResponse<UserResponseDto>> {
        return this.userService.update(id, updateRequest);
    }

    @Delete(":id")
    @ApiOperation({ summary: "Delete a user by ID" })
    async remove(@Param("id", ParseIntPipe) id: number): Promise<AppResponse<any>> {
        return this.userService.remove(id);
    }
}