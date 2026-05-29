# 03 — Architecture Guide

## Core Architectural Principles

### 1. Feature-Based Architecture

Group by business domain, not by file type. Every feature is a vertical slice that owns everything it needs.

```
WRONG (type-based):
controllers/
  users.controller.ts
  leads.controller.ts
services/
  users.service.ts
  leads.service.ts

RIGHT (feature-based):
features/users/
  users.controller.ts
  users.service.ts
  users.repository.ts
  entities/user.entity.ts
features/leads/
  leads.controller.ts
  leads.service.ts
  leads.repository.ts
  entities/lead.entity.ts
```

**Why**: When a feature is deleted or extracted to a microservice, everything in its folder goes with it. No orphaned files.

---

### 2. Three-Layer Architecture (Strict Enforcement)

Every request flows through exactly three layers. No layer skips another. No layer reaches upward.

```
Request → Controller → Service → Repository → Database
                            ↑
                     Business logic lives here
```

#### Layer Responsibilities

| Layer | Responsibility | Must NOT |
|---|---|---|
| **Controller** | Parse HTTP, validate input DTOs, call service, return response | Contain `if/else` business logic |
| **Service** | Business logic, orchestration, transaction management | Inject repositories from other modules |
| **Repository** | Raw database queries, TypeORM operations | Contain business logic |
| **Entity** | Database schema definition | Contain service or repository imports |

---

### 3. Controller Layer

Controllers are thin HTTP adapters. They parse requests and delegate everything else to services.

```typescript
// features/leads/leads.controller.ts
@ApiTags('Leads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  // ✅ Good — delegates immediately, no logic
  @Get()
  @ApiOperation({ summary: 'List all leads with pagination' })
  findAll(@Query() query: ListLeadsDto): Promise<PaginatedResponse<LeadResponseDto>> {
    return this.leadsService.findAll(query);
  }

  // ❌ Bad — business logic in controller
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const lead = await this.leadsService.findOne(id);
    if (!lead) throw new NotFoundException();   // Wrong layer — belongs in service
    if (lead.status === 'deleted') return null;  // Wrong layer — business rule
    return lead;
  }
}
```

**Controller Rules**:
- Use `ParseIntPipe` / `ParseUUIDPipe` for all route parameters
- All routes decorated with Swagger (`@ApiOperation`, `@ApiResponse`)
- Use `@UseGuards(JwtAuthGuard)` on protected controllers
- Use `@Roles()` decorator for role-based restrictions
- Return types must be explicit — no implicit `any`

---

### 4. Service Layer

Services contain all business logic. They orchestrate repositories and other services.

```typescript
// features/leads/leads.service.ts
@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    private readonly leadsRepository: LeadsRepository,
    private readonly usersService: UsersService,   // ← Injects SERVICE not repo
  ) {}

  async findAll(query: ListLeadsDto): Promise<PaginatedResponse<LeadResponseDto>> {
    const [leads, total] = await this.leadsRepository.findPaginated(query);
    return {
      data: leads.map(lead => new LeadResponseDto(lead)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(createDto: CreateLeadDto, userId: number): Promise<LeadResponseDto> {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.leadsRepository.findByEmail(createDto.email);
    if (existing) throw new ConflictException('A lead with this email already exists');

    const lead = this.leadsRepository.create({ ...createDto, assignedTo: user });
    const saved = await this.leadsRepository.save(lead);

    this.logger.log(`Lead created: ${saved.id} by user ${userId}`);
    return new LeadResponseDto(saved);
  }

  // Internal method — returns raw entity for other services
  async findById(id: number): Promise<Lead | null> {
    return this.leadsRepository.findOne({ where: { id } });
  }
}
```

**Service Rules**:
- Never inject a Repository from another feature — inject that feature's Service
- Always `throw` typed NestJS exceptions (`NotFoundException`, `ConflictException`, etc.)
- Provide `findById`-style internal methods that return raw entities for cross-module use
- Public methods used by controllers return Response DTOs
- Always use `Logger` for significant operations

---

### 5. Repository Layer

Repositories contain all database access. Services call semantic repository methods — they never write queries.

```typescript
// features/leads/leads.repository.ts
@Injectable()
export class LeadsRepository extends Repository<Lead> {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
  ) {
    super(leadRepository.target, leadRepository.manager, leadRepository.queryRunner);
  }

  async findPaginated(query: ListLeadsDto): Promise<[Lead[], number]> {
    const qb = this.leadRepository.createQueryBuilder('lead')
      .leftJoinAndSelect('lead.assignedTo', 'user')
      .select([
        'lead.id',
        'lead.firstName',
        'lead.lastName',
        'lead.email',
        'lead.status',
        'lead.createdAt',
        'user.id',
        'user.firstName',
      ]);                              // ← Always select only needed fields

    if (query.search) {
      qb.andWhere(
        'lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.email ILIKE :search',
        { search: `%${query.search}%` },
      );
    }

    if (query.status) {
      qb.andWhere('lead.status = :status', { status: query.status });
    }

    return qb
      .orderBy('lead.createdAt', query.order ?? 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();
  }

  async findByEmail(email: string): Promise<Lead | null> {
    return this.leadRepository.findOne({ where: { email } });
  }
}
```

**Repository Rules**:
- Always use `.select([...])` — never return all columns with `SELECT *`
- Use semantic method names: `findByEmail()`, `findActiveLeads()` — not `findOne({ where: { status: 'active' } })` scattered across services
- Complex joins and filters belong here, not in services
- Use `createQueryBuilder` for multi-join queries

---

### 6. DTO Layer

DTOs form the contract between layers. Request DTOs validate input. Response DTOs transform output.

```typescript
// dto/request/create-lead.dto.ts
export class CreateLeadDto {
  @ApiProperty({ example: 'Jane', description: 'Lead first name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: LeadStatus, example: LeadStatus.NEW })
  @IsEnum(LeadStatus)
  status: LeadStatus;
}

// dto/response/lead-response.dto.ts
export class LeadResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: LeadStatus })
  status: LeadStatus;

  constructor(lead: Lead) {
    this.id = lead.id;
    this.firstName = lead.firstName;
    this.lastName = lead.lastName;
    this.email = lead.email;
    this.status = lead.status;
    // password, salt, internal fields: intentionally excluded
  }
}
```

**DTO Rules**:
- All mapping logic lives in the Response DTO constructor — never in the service layer
- Never use `Object.assign(this, data)` — map every field explicitly
- Never expose sensitive fields (passwords, tokens, internal flags) in Response DTOs
- Request DTOs: validators on every field
- Response DTOs: `@ApiProperty()` on every field

---

### 7. Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                    HTTP Client                        │
└──────────────────────────┬───────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────┐
│                  NestJS HTTP Layer                    │
│          (Guards → Interceptors → Pipes)              │
└──────────────────────────┬───────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼──────┐  ┌───────▼──────┐  ┌──────▼──────┐
│  UsersModule  │  │  LeadsModule │  │  AuthModule │
│               │  │              │  │             │
│  Controller   │  │  Controller  │  │  Controller │
│  Service      │  │  Service     │  │  Service    │
│  Repository   │  │  Repository  │  │  Strategy   │
│  Entity       │  │  Entity      │  │             │
└───────┬───────┘  └──────┬───────┘  └──────┬──────┘
        │                 │                  │
        └─────────────────▼──────────────────┘
                          │
              ┌───────────▼──────────┐
              │  TypeORM DataSource  │
              │  (PostgreSQL)        │
              └──────────────────────┘
```

---

### 8. Module Dependency Rules

```
auth/AuthModule
  └── imports UsersModule (injects UsersService only)

features/leads/LeadsModule
  └── imports UsersModule (injects UsersService only)
  └── NEVER imports UsersRepository directly

common/guards
  └── imports AuthModule (injects JwtService)
```

**Circular dependency prevention**:

```
WRONG (circular):
  UsersModule → AuthModule → UsersModule

RIGHT (extract shared logic):
  UsersModule → SharedModule
  AuthModule  → SharedModule
```

If you need `forwardRef()`, stop and redesign. It is a symptom of circular dependency, not a solution.

---

## Anti-Patterns

| Anti-pattern | Problem | Fix |
|---|---|---|
| Business logic in Controller | Hard to test, breaks SRP | Move `if/else` and validation to Service |
| Repository injected across modules | Breaks encapsulation | Export only Service from modules |
| Service doing data mapping | Mixes concerns | Put all mapping in Response DTO constructor |
| `SELECT *` in repositories | Over-fetches data, leaks sensitive fields | Always specify `.select([...])` |
| `forwardRef()` | Hides circular dependency | Extract shared logic to a third module |
| Raw `process.env` in features | Not testable, not typed | Use `ConfigService.get()` |
| Nested try/catch everywhere | Inconsistent error handling | Use global exception filter |

---

## Scalability Recommendations

1. **Enforce module boundaries** — never import from another feature's `entities/` or `dto/` directly.
2. **Barrel files (`index.ts`)** — export only the public API of each feature.
3. **Feature flags** — gate new features behind a config value during development.
4. **Max ~200 lines per service** — if larger, split into sub-services or extract to a sub-feature.
5. **Repository method count** — if a repository exceeds ~15 methods, consider splitting by query domain.
