
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserRepository } from "./user.repository";
import { MapToModuleName, MODULE_CONSTANTS, SuccessConstant } from "@core-constants";
import { CreateUserDto, ListUserRequestDto, UpdateUserDto } from "./dto/request";
import { User } from "@core-database";
import { AppResponse, CommonSearchResponseDto } from "@business-core-dto";
import { GenerateLogPrefix } from "@core-utilities";
import { UserResponseDto } from "./dto/response";
import { ModuleNames } from "@core-enums";

/**
 * Handles user CRUD operations and profile management
 */
@Injectable()
export class UserService {
    readonly #logger: Logger = new Logger(UserService.name);
    private readonly USER_CACHE_MODULE = MODULE_CONSTANTS.USER;
    private readonly CACHE_TTL = 360; // 6 minutes

    constructor(
        private readonly userRepository: UserRepository,
        private readonly configService: ConfigService
    ) { }
    /**
       * Find users with search, filter, pagination, and sorting
       * @param searchRequest - List user request parameters with role and status filters
       * @returns Promise of AppResponse with user list
       */
    async findList(
        searchRequest: ListUserRequestDto,
        user: User
    ): Promise<AppResponse<CommonSearchResponseDto<UserResponseDto>>> {
        // Check cache first


        const [users, total] = await this.userRepository.findUsers(searchRequest, user);

        // Map User entities to UserResponseDto
        const result = users.map((user) => new UserResponseDto(user));

        const response = new CommonSearchResponseDto(
            result,
            searchRequest.pageSize || 10,
            searchRequest.pageNumber || 1,
            total
        );


        return new AppResponse(SuccessConstant.ListFetch, response, { module: MapToModuleName(ModuleNames.USER) });
    }

    /**
     * Create a new user
     * @param createRequest - Create user request data
     * @returns Promise of AppResponse with created user
     */
    async create(createRequest: CreateUserDto): Promise<AppResponse<UserResponseDto>> {
        const user = this.userRepository.create(createRequest);
        const savedUser = await this.userRepository.save(user);
        const response = new UserResponseDto(savedUser);
        return new AppResponse(SuccessConstant.AddSuccessAction, response, { module: MapToModuleName(ModuleNames.USER) });
    }

    /**
     * Find a user by ID
     * @param id - User ID
     * @returns Promise of AppResponse with user data
     */
    async findOne(id: number): Promise<AppResponse<UserResponseDto>> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new Error('User not found'); // Should use a proper HttpException, but keeping simple for now
        }
        const response = new UserResponseDto(user);
        return new AppResponse(SuccessConstant.DetailFetch, response, { module: MapToModuleName(ModuleNames.USER) });
    }

    /**
     * Update a user by ID
     * @param id - User ID
     * @param updateRequest - Update user data
     * @returns Promise of AppResponse with updated user
     */
    async update(id: number, updateRequest: UpdateUserDto): Promise<AppResponse<UserResponseDto>> {
        let user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new Error('User not found');
        }

        user = this.userRepository.merge(user, updateRequest);
        const savedUser = await this.userRepository.save(user);
        const response = new UserResponseDto(savedUser);
        return new AppResponse(SuccessConstant.UpdateSuccessAction, response, { module: MapToModuleName(ModuleNames.USER) });
    }

    /**
     * Delete a user by ID
     * @param id - User ID
     * @returns Promise of AppResponse with deletion confirmation
     */
    async remove(id: number): Promise<AppResponse<any>> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            throw new Error('User not found');
        }

        await this.userRepository.softRemove(user);
        return new AppResponse(SuccessConstant.RemoveSuccessAction, {}, { module: MapToModuleName(ModuleNames.USER) });
    }
}
