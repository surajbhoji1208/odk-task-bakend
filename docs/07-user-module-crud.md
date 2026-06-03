# User Module CRUD Implementation Details

This document outlines the steps taken to implement simple CRUD operations with pagination listing for the User module. 

## 1. DTO (Data Transfer Object) Creation

We created two new request DTOs in `libs/@oc/business-core/modules/user/dto/request/` to handle validation and documentation for creation and updates.

### `create-user.request.dto.ts`
Created basic fields for `fullName`, `email`, `phoneNumber`, and `password` with appropriate decorators (`@IsString`, `@IsEmail`, etc.) and swagger documentation (`@ApiProperty`).

### `update-user.request.dto.ts`
Created fields similar to creation but made them optional using `@IsOptional` and `@ApiPropertyOptional`.

### `index.ts`
Updated the barrel file to export the newly created DTOs:
```typescript
export * from "./list-user.request.dto";
export * from "./create-user.request.dto";
export * from "./update-user.request.dto";
```

## 2. Service Update (`UserService`)

Updated `libs/@oc/business-core/modules/user/user.service.ts` to implement the core business logic.

The existing `findList` method was retained for handling the paginated listing feature. 
The following methods were added:
- **`create(createRequest: CreateUserDto)`**: Creates a new User instance, saves it to the database, and returns a mapped `UserResponseDto`.
- **`findOne(id: number)`**: Fetches a single user by ID. Throws an error if the user is not found.
- **`update(id: number, updateRequest: UpdateUserDto)`**: Fetches a user, merges the update payload, saves changes, and returns the updated user.
- **`remove(id: number)`**: Fetches a user and executes a soft delete (`softRemove`) to safely maintain records.

## 3. Controller Update (`UserController`)

Updated `src/modules/user/user.controller.ts` to expose the REST API endpoints mapping to the `UserService`.

- `@Post()` - Maps to `userService.create()`.
- `@Get()` - Maps to `userService.findList()`, utilizing `ListUserRequestDto` for pagination, search, and filtering, and pulling the current user from the `@CurrentUser()` decorator.
- `@Get(':id')` - Maps to `userService.findOne()`.
- `@Put(':id')` - Maps to `userService.update()`.
- `@Delete(':id')` - Maps to `userService.remove()`.

Added `@ApiTags("User")` and `@ApiOperation` for clear Swagger documentation.

## Summary

This update completes a simple yet robust implementation of user CRUD operations with existing paginated listing functionality, leveraging the shared business-core architecture and standard TypeORM methods.
