# 02 — Folder Structure

## Philosophy

Enterprise NestJS applications are organized as a **monorepo** with a strict separation between the API layer (`src/`) and the business/infrastructure layers (`libs/`). The API layer contains only HTTP wiring; all business logic lives in dedicated library packages. This enforces clean architecture at the file-system level.

---

## Full Structure

```
src/
├── app.module.ts                        # Root module — wires everything
├── main.ts                              # Bootstrap entry point
│
└── modules/                             # API Layer — HTTP wiring only
    ├── users/
    │   ├── users.controller.ts          # HTTP endpoints — no business logic
    │   └── users.module.ts              # NestJS module definition
    ├── auth/
    │   ├── auth.controller.ts
    │   └── auth.module.ts
    └── dashboard/
        ├── dashboard.controller.ts
        └── dashboard.module.ts

libs/
├── @oc/
│   ├── business-core/                   # Business Logic Layer
│   │   ├── modules/
│   │   │   ├── users/
│   │   │   │   ├── dto/
│   │   │   │   │   ├── request/         # Input validation DTOs
│   │   │   │   │   │   ├── create-user.request.dto.ts
│   │   │   │   │   │   ├── update-user.request.dto.ts
│   │   │   │   │   │   └── list-user.request.dto.ts
│   │   │   │   │   ├── response/        # Output transformation DTOs
│   │   │   │   │   │   └── user.response.dto.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── users.service.ts     # Business logic + orchestration
│   │   │   │   ├── users.repository.ts  # Data access layer
│   │   │   │   └── index.ts
│   │   │   └── ...                      # Other business modules
│   │   └── dto/                         # Shared cross-module DTOs
│   │       └── common-search-response.dto.ts
│   │
│   └── server-core/                     # Infrastructure Layer
│       ├── database/
│       │   ├── entities/                # TypeORM entities
│       │   │   ├── user.entity.ts
│       │   │   └── ...
│       │   └── migrations/
│       │       ├── database-changes/    # Schema migrations
│       │       │   ├── 1700000000000-initial-setup.ts
│       │       │   └── 1700000000001-add-user-role.ts
│       │       ├── seeds/               # Seed data
│       │       │   └── 1700000002000-SEED-super-admin-user.ts
│       │       └── functions/           # DB functions
│       │           └── 1700000001001-FUNCTION-add-dashboard-kpis.ts
│       ├── enums/                       # Shared enums
│       ├── constants/                   # Field lengths, messages
│       ├── utilities/                   # Utility functions
│       ├── custom-validators/           # Custom validation decorators
│       ├── custom-decorators/           # Custom NestJS decorators
│       ├── custom-guards/               # Auth/permission guards
│       └── shared-modules/              # Shared NestJS modules
```

---

## Layer Responsibilities

### `src/modules/{module}/`

**Purpose**: HTTP wiring only — routes map to service calls.

**Rules**:
- No business logic
- No DTO instantiation
- No direct repository access
- Delegates 100% to the corresponding service

```typescript
// ✅ Good — controller delegates entirely to service
async findAll(@Query() query: ListUserRequestDto): Promise<AppResponse<CommonSearchResponseDto<UserResponseDto>>> {
    return this.userService.findList(query);
}
```

---

### `libs/@oc/business-core/modules/{module}/`

**Purpose**: All business logic, data access, and DTO definitions for a domain.

#### Service (`{module}.service.ts`)
- Contains all business logic
- Orchestrates repositories and other services
- Returns `AppResponse` objects for API methods
- Provides raw-entity internal methods for cross-module communication
- Strongly typed — no `any`

#### Repository (`{module}.repository.ts`)
- Direct database access via TypeORM QueryBuilder
- Returns selective fields only — never `SELECT *`
- Semantic method names (`findByEmail`, `findActiveUsers`)

#### DTOs (`dto/request/` and `dto/response/`)
- Request DTOs: input validation using custom validators from `@core-custom-validators`
- Response DTOs: output transformation with **all mapping in the constructor**
- All exports through `index.ts`

---

### `libs/@oc/server-core/database/`

**Purpose**: TypeORM entities and migration files.

**Rules**:
- All entities extend `BaseModifiableEntity` or `BaseModifiableEntityWithoutIdentity`
- `@PrimaryGeneratedColumn('uuid')` on every entity
- Field lengths come from constants (`@core-constants`) — no magic numbers
- `synchronize: false` always in production; migrations are the only schema change mechanism

**Migration naming**:
```
database-changes/    ← schema changes: {timestamp}-{description}.ts
seeds/               ← data seeds:   {timestamp}-SEED-{description}.ts
functions/           ← db functions: {timestamp}-FUNCTION-{description}.ts
```

---

## Path Aliases

Always use tsConfig path aliases — never relative imports (`../../`).

| Alias | Path | Usage |
|-------|------|-------|
| `@business-core-dto` | `libs/@oc/business-core/dto` | Common DTOs |
| `@business-core-modules` | `libs/@oc/business-core/modules` | Business modules |
| `@core-database` | `libs/@oc/server-core/database` | Entities, migrations |
| `@core-enums` | `libs/@oc/server-core/enums` | Enums |
| `@core-constants` | `libs/@oc/server-core/constants` | Constants |
| `@core-utilities` | `libs/@oc/server-core/utilities` | Utility functions |
| `@core-custom-validators` | `libs/@oc/server-core/custom-validators` | Validators |
| `@core-custom-decorators` | `libs/@oc/server-core/custom-decorators` | Decorators |
| `@core-custom-guards` | `libs/@oc/server-core/custom-guards` | Guards |
| `@core-shared-modules` | `libs/@oc/server-core/shared-modules` | Shared modules |

```typescript
// ❌ Wrong
import { User } from '../../../server-core/database/entities/user.entity';

// ✅ Correct
import { User } from '@core-database';
import { CreateUserRequestDto } from '@business-core-modules';
```

---

## New Module Template

When adding a new domain (e.g. `product`):

```
# 1. API layer
src/modules/product/
├── product.controller.ts
└── product.module.ts

# 2. Business logic layer
libs/@oc/business-core/modules/product/
├── dto/
│   ├── request/
│   │   ├── create-product.request.dto.ts
│   │   ├── update-product.request.dto.ts
│   │   └── list-product.request.dto.ts
│   ├── response/
│   │   └── product.response.dto.ts
│   └── index.ts
├── product.service.ts
├── product.repository.ts
└── index.ts

# 3. Database entity
libs/@oc/server-core/database/entities/
└── product.entity.ts
```

**Module definition rule**: export **only** the Service — never the Repository or Entity.

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],   // ← Service only
})
export class ProductModule {}
```

---

## Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | `kebab-case` | `create-user.request.dto.ts` |
| Classes | `PascalCase` | `UsersService` |
| Entities | `PascalCase` + `.entity.ts` | `user.entity.ts` → `User` |
| Request DTOs | `PascalCase` + `.request.dto.ts` | `CreateUserRequestDto` |
| Response DTOs | `PascalCase` + `.response.dto.ts` | `UserResponseDto` |
| Guards | `kebab-case.guard.ts` | `jwt-auth.guard.ts` |
| Decorators | `kebab-case.decorator.ts` | `current-user.decorator.ts` |
| Constants | `UPPER_SNAKE_CASE` | `JWT_EXPIRES_IN` |

---

## Module Boundary Rules

```
┌──────────────────────────────────────────────────────────┐
│  src/modules/users/                                       │
│  ┌─────────────┐                                         │
│  │ Controller  │  HTTP only — delegates to service        │
│  └──────┬──────┘                                         │
└─────────┼────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────┐
│  libs/@oc/business-core/modules/users/                    │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────┐   │
│  │   Service   │───▶│  Repository  │───▶│   Entity   │   │
│  └─────────────┘    └──────────────┘    └────────────┘   │
│  Business logic      DB queries only    TypeORM model     │
└──────────────────────────────────────────────────────────┘
          │
          │  (only Service crosses module boundaries)
          ▼
┌──────────────────────────────────────────────────────────┐
│  libs/@oc/business-core/modules/leads/                    │
│  imports UsersService — never UsersRepository             │
└──────────────────────────────────────────────────────────┘
```

---

## What NOT to Put Where

| Anti-pattern | Why it breaks |
|---|---|
| Business logic in Controller | Untestable; controllers should only delegate |
| Repository exported from module | Breaks encapsulation — other modules bypass service layer |
| `any` type anywhere | Undermines type safety across the codebase |
| Relative imports (`../../`) | Brittle; use path aliases |
| `class-validator` decorators | Use custom validators from `@core-custom-validators` |
| Data transformation in Service | Mapping belongs in Response DTO constructors |
| DTO instantiation in Controller | Controllers receive and return; Services produce DTOs |
| Hardcoded error strings | Use standardized error keys (`ERR_EMAIL_EXISTS`, etc.) |
| `forwardRef()` anywhere | Signals circular dependency — refactor into a third service |
