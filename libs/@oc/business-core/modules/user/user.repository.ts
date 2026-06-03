import { User } from "@core-database";
import { SortDirection } from "@core-enums";
import { Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ListUserRequestDto } from "./dto/request/list-user.request.dto";

/**
 * Repository class for User entity operations
 * Handles database queries and complex filtering/pagination logic
 */
@Injectable({ scope: Scope.REQUEST })
export class UserRepository extends Repository<User> {
    constructor(
        @InjectRepository(User)
        repository: Repository<User>
    ) {
        super(repository.target, repository.manager, repository.queryRunner);
    }

    /**
     * Find users with search, filter, pagination, and sorting.
     * Search: name (fullName), email, phoneNumber.
     * Filter: userType, status, roleId.
     * Sort: name (fullName), createdAt.
     * @param searchRequest - List user request parameters
     * @returns Promise of users array and total count
     */
    async findUsers(
        searchRequest: ListUserRequestDto,
        user: User
    ): Promise<[User[], number]> {
        const qb = this.createQueryBuilder("user")
            .select([
                "user.id",
                "user.uuid",
                "user.fullName",
                "user.email",

            ])




        // Search: name, email, phoneNumber (with and without country code)
        if (searchRequest.searchText) {
            qb.andWhere(
                `(
                    user.fullName ILIKE :q
                    OR user.email ILIKE :q
                    OR CONCAT(user.countryCode, ' ', user.phoneNumber) ILIKE :q
                    OR CONCAT(user.countryCode, user.phoneNumber) ILIKE :q
                    OR user.phoneNumber ILIKE :q
                )`,
                { q: `%${searchRequest.searchText}%` }
            );
        }



        // Safely resolve sort field — fall back to createdAt if sortBy is missing or unrecognised
        const orderDirection =
            searchRequest.sortDirection === SortDirection.ASC ? SortDirection.ASC : SortDirection.DESC;

        qb.orderBy("user.createdAt", orderDirection);

        const pageSize = searchRequest.pageSize || 10;
        const pageNumber = searchRequest.pageNumber || 1;
        const offset = (pageNumber - 1) * pageSize;

        if (!(pageNumber === 0 && pageSize === 0)) {
            qb.skip(offset).take(pageSize);
        }

        return qb.getManyAndCount();
    }








}
