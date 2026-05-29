# 04 — Routing Strategy

## Overview

NestJS routing is defined through controller decorators. Every route is version-prefixed, RESTful, and documented with Swagger. Guards, pipes, and interceptors compose via decorators — no middleware wiring needed.

---

## Root Route Configuration (`main.ts`)

```typescript
// src/main.ts
app.setGlobalPrefix('api');
app.enableVersioning({ type: VersioningType.URI });
```

All routes follow the pattern: `GET /api/v{n}/{resource}`

---

## Route Structure Convention

```
/api/v1/auth/login          → public POST  — issue JWT
/api/v1/auth/refresh        → public POST  — refresh token
/api/v1/auth/logout         → protected    — invalidate token

/api/v1/users               → protected    — list users (admin only)
/api/v1/users/:id           → protected    — get one user
/api/v1/users/:id           → protected    — update user (PUT)
/api/v1/users/:id           → protected    — delete user (DELETE)

/api/v1/dashboard           → protected    — any authenticated user
/api/v1/leads               → protected    — list with pagination
/api/v1/leads/:id           → protected    — get one lead
/api/v1/leads               → protected    — create lead (POST)
/api/v1/leads/:id           → protected    — update lead (PUT)
/api/v1/leads/:id           → protected    — delete lead (DELETE)
```

---

## Controller Setup

```typescript
// features/leads/leads.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, ListLeadsDto } from './dto/request';
import { LeadResponseDto } from './dto/response/lead-response.dto';
import { PaginatedResponse } from '@common/interfaces/paginated-response.interface';
import { UserRole } from '@auth/enums/user-role.enum';

@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'List all leads with pagination, search, and filters' })
  @ApiResponse({ status: 200, type: LeadResponseDto, isArray: true })
  findAll(@Query() query: ListLeadsDto): Promise<PaginatedResponse<LeadResponseDto>> {
    return this.leadsService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT)
  @ApiOperation({ summary: 'Get a single lead by ID' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<LeadResponseDto> {
    return this.leadsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, type: LeadResponseDto })
  create(@Body() createDto: CreateLeadDto): Promise<LeadResponseDto> {
    return this.leadsService.create(createDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update an existing lead' })
  @ApiResponse({ status: 200, type: LeadResponseDto })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    return this.leadsService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a lead' })
  @ApiResponse({ status: 204 })
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.leadsService.remove(id);
  }
}
```

---

## HTTP Method Conventions

| Action | Method | Status | Route |
|--------|--------|--------|-------|
| List resources | GET | 200 | `/leads` |
| Get one resource | GET | 200 | `/leads/:id` |
| Create resource | POST | 201 | `/leads` |
| Replace resource | PUT | 200 | `/leads/:id` |
| Partial update | PATCH | 200 | `/leads/:id` |
| Delete resource | DELETE | 204 | `/leads/:id` |

---

## Guards

### JWT Auth Guard

Validates the Bearer token on every protected route.

```typescript
// common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '@common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

### Roles Guard

Checks the user's role against the `@Roles()` decorator.

```typescript
// common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { UserRole } from '@auth/enums/user-role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

---

## Custom Decorators

### `@Roles()` — Restrict to specific roles

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@auth/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

Usage:

```typescript
@Get()
@Roles(UserRole.ADMIN, UserRole.MANAGER)
findAll() { ... }
```

### `@Public()` — Mark a route as publicly accessible

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Usage:

```typescript
@Post('login')
@Public()
login(@Body() dto: LoginDto) { ... }
```

### `@CurrentUser()` — Inject the authenticated user from the request

```typescript
// common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@features/users/entities/user.entity';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

Usage:

```typescript
@Get('profile')
getProfile(@CurrentUser() user: User): UserResponseDto {
  return new UserResponseDto(user);
}
```

---

## Pagination DTO

All list endpoints accept a standard pagination request:

```typescript
// common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional({ example: 'jane' })
  @IsOptional()
  @IsString()
  search?: string;
}
```

Standard paginated response shape:

```typescript
// common/interfaces/paginated-response.interface.ts
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

---

## Route Versioning

NestJS URI versioning is configured globally. Each controller declares its version:

```typescript
@Controller({ path: 'leads', version: '1' })   // → /api/v1/leads
export class LeadsController {}

@Controller({ path: 'leads', version: '2' })   // → /api/v2/leads (new version)
export class LeadsV2Controller {}
```

---

## Global Exception Filter

Catches all unhandled exceptions and returns a consistent error shape.

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(`HTTP ${status}`, exception instanceof Error ? exception.stack : '');

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
```

Register globally in `main.ts`:

```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

---

## Anti-Patterns

| Anti-pattern | Problem |
|---|---|
| Verb in route URL (`/getLeads`, `/createLead`) | Breaks REST — use nouns + HTTP methods |
| No version prefix | Breaking changes affect all clients |
| Business logic in Controller | Hard to test; controllers are HTTP adapters only |
| No `ParseIntPipe` on numeric params | Silent NaN bugs when non-numeric strings passed |
| No `@ApiBearerAuth()` on protected controllers | Swagger tests fail; security intent unclear |
| Hardcoded status codes instead of `HttpStatus` enum | Magic numbers — unreadable, error-prone |
