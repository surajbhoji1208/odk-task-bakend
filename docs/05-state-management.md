# 05 — State Management

## Overview

A NestJS backend has no reactive UI state — instead, "state" means:

| State type | Tool | Scope |
|---|---|---|
| Request-scoped context | `REQUEST`-scoped providers | Per HTTP request |
| Application config | `ConfigService` | App-wide singleton |
| Cached data | In-memory cache / Redis | Cross-request, TTL-based |
| Database state | TypeORM + PostgreSQL | Persistent |
| Auth/session state | JWT (stateless) | Encoded in token |

**Rule**: NestJS is stateless by default. Avoid any module-level mutable state. If you need to share data across a request pipeline, use request-scoped providers. If you need to share across requests, use a cache.

---

## Request-Scoped Providers

When a provider needs access to the current request (e.g., the authenticated user, tenant ID, correlation ID), use `Scope.REQUEST`.

```typescript
// common/services/request-context.service.ts
import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class RequestContextService {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  getCurrentUser(): Express.User | undefined {
    return this.request.user;
  }

  getCorrelationId(): string {
    return (this.request.headers['x-correlation-id'] as string) ?? crypto.randomUUID();
  }

  getIpAddress(): string {
    return this.request.ip ?? 'unknown';
  }
}
```

> **Important**: Request-scoped providers force all providers that inject them to also become request-scoped. Use sparingly — only in services that genuinely need per-request data.

---

## Application Configuration State

Application-wide, read-only configuration is accessed through `ConfigService`. This is the correct replacement for module-level globals.

```typescript
// Registering namespaced config
// config/jwt.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
```

```typescript
// Consuming in a service
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private getJwtSecret(): string {
    return this.configService.getOrThrow<string>('jwt.secret');
  }
}
```

> Use `getOrThrow()` for values that must exist — it throws at startup if the variable is missing, preventing silent bugs.

---

## In-Memory Caching

Use NestJS's built-in `CacheModule` for lightweight caching. The default store is in-memory (suitable for single-instance apps and development).

### Setup

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60,      // default TTL: 60 seconds
      max: 100,     // maximum number of cached items
    }),
  ],
})
export class AppModule {}
```

### Usage in a Service

```typescript
import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { InjectCache } from '@nestjs/cache-manager';

@Injectable()
export class DashboardService {
  constructor(
    @InjectCache() private cacheManager: Cache,
    private readonly leadsRepository: LeadsRepository,
  ) {}

  async getDashboardStats(): Promise<DashboardStatsDto> {
    const cacheKey = 'dashboard:stats';
    const cached = await this.cacheManager.get<DashboardStatsDto>(cacheKey);
    if (cached) return cached;

    const stats = await this.computeStats();
    await this.cacheManager.set(cacheKey, stats, 300);  // cache for 5 minutes
    return stats;
  }

  private async computeStats(): Promise<DashboardStatsDto> {
    const [totalLeads, activeDeals, closedThisMonth] = await Promise.all([
      this.leadsRepository.count(),
      this.leadsRepository.countActiveDeals(),
      this.leadsRepository.countClosedThisMonth(),
    ]);
    return new DashboardStatsDto({ totalLeads, activeDeals, closedThisMonth });
  }

  async invalidateDashboardCache(): Promise<void> {
    await this.cacheManager.del('dashboard:stats');
  }
}
```

---

## Redis Caching (Production)

For multi-instance deployments, replace the in-memory store with Redis.

```bash
npm install @nestjs/cache-manager cache-manager-redis-yet
```

```typescript
// app.module.ts
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.getOrThrow<string>('redis.host'),
            port: configService.getOrThrow<number>('redis.port'),
          },
          ttl: 60 * 1000,  // 60 seconds in ms for redis store
        }),
      }),
    }),
  ],
})
export class AppModule {}
```

Add to `.env`:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## Cache Invalidation Patterns

### Manual invalidation on mutation

```typescript
@Injectable()
export class LeadsService {
  constructor(
    private readonly leadsRepository: LeadsRepository,
    @InjectCache() private cacheManager: Cache,
  ) {}

  async create(createDto: CreateLeadDto): Promise<LeadResponseDto> {
    const lead = await this.leadsRepository.save(
      this.leadsRepository.create(createDto),
    );
    // Invalidate any cached lead lists
    await this.cacheManager.del('leads:list');
    return new LeadResponseDto(lead);
  }

  async findAll(query: ListLeadsDto): Promise<PaginatedResponse<LeadResponseDto>> {
    const cacheKey = `leads:list:page${query.page}:limit${query.limit}`;
    const cached = await this.cacheManager.get<PaginatedResponse<LeadResponseDto>>(cacheKey);
    if (cached) return cached;

    const [leads, total] = await this.leadsRepository.findPaginated(query);
    const result = {
      data: leads.map(l => new LeadResponseDto(l)),
      total,
      page: query.page,
      limit: query.limit,
    };
    await this.cacheManager.set(cacheKey, result, 120);  // 2-minute cache
    return result;
  }
}
```

### Cache key strategy

```
leads:list:page1:limit20          # Paginated list
leads:detail:42                   # Single entity by ID
dashboard:stats                   # Aggregated stats (longer TTL)
user:profile:7                    # User profile
```

---

## TypeORM Transaction Management

For multi-step database operations, use `QueryRunner` to ensure atomicity.

```typescript
// features/users/users.service.ts
@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createWithProfile(createDto: CreateUserWithProfileDto): Promise<UserResponseDto> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = queryRunner.manager.create(User, {
        email: createDto.email,
        firstName: createDto.firstName,
      });
      const savedUser = await queryRunner.manager.save(user);

      const profile = queryRunner.manager.create(UserProfile, {
        userId: savedUser.id,
        bio: createDto.bio,
        avatarUrl: createDto.avatarUrl,
      });
      await queryRunner.manager.save(profile);

      await queryRunner.commitTransaction();
      return new UserResponseDto(savedUser);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
```

> **Rule**: Use `QueryRunner` only when you have two or more database writes that must succeed or fail together. Single writes do not need explicit transactions.

---

## Logging State

Structured logging should capture request metadata automatically.

```typescript
// common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} ${response.statusCode} — ${duration}ms`);
      }),
    );
  }
}
```

Register globally:

```typescript
// main.ts
app.useGlobalInterceptors(new LoggingInterceptor());
```

---

## Response Transformation

A global interceptor can wrap all responses in a consistent envelope:

```typescript
// common/interceptors/response-transform.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Module-level mutable state (`static data: Lead[] = []`) | Not thread-safe; leaks between requests | Use database or cache |
| Caching inside Repository | Mixes data access with caching concern | Cache at Service layer |
| `process.env` checks scattered through services | Not testable; config changes require code search | Always use `ConfigService` |
| No cache invalidation on mutation | Stale data served after writes | Invalidate cache keys in create/update/delete |
| `QueryRunner` for every single operation | Unnecessary overhead | Use it only for multi-step writes |
| `Scope.REQUEST` on every provider | Performance overhead; disables singleton optimization | Only use where per-request data is genuinely needed |
