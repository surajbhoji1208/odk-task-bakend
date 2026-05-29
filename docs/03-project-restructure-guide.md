# 03 — Step-by-Step: Restructure the Initial NestJS Project

## What This Guide Does

Transforms a freshly scaffolded `nest new` project (flat `src/` with `app.controller.ts` / `app.service.ts`) into the enterprise monorepo-style architecture defined in `02-folder-structure.md`:

```
src/modules/          ← HTTP layer only
libs/@oc/
  business-core/      ← Services, Repositories, DTOs
  server-core/        ← Entities, Migrations, Validators, Guards, Constants
```

All steps are performed inside `my-enterprise-app-backend/`.

---

## Step 1 — Delete the Default Boilerplate Files

The generated `app.controller.ts` and `app.service.ts` are replaced by the proper layered structure.

```bash
rm src/app.controller.ts
rm src/app.controller.spec.ts
rm src/app.service.ts
```

---

## Step 2 — Switch TypeScript Module System to CommonJS

The default NestJS 11 scaffold uses `"module": "nodenext"`, which conflicts with `tsconfig-paths` (used for path aliases). Switch to `commonjs`.

**Replace `tsconfig.json` with:**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "forceConsistentCasingInFileNames": true,
    "strictBindCallApply": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@business-core-dto":         ["libs/@oc/business-core/dto/index.ts"],
      "@business-core-modules":     ["libs/@oc/business-core/modules/index.ts"],
      "@core-database":             ["libs/@oc/server-core/database/index.ts"],
      "@core-enums":                ["libs/@oc/server-core/enums/index.ts"],
      "@core-constants":            ["libs/@oc/server-core/constants/index.ts"],
      "@core-utilities":            ["libs/@oc/server-core/utilities/index.ts"],
      "@core-custom-validators":    ["libs/@oc/server-core/custom-validators/index.ts"],
      "@core-custom-decorators":    ["libs/@oc/server-core/custom-decorators/index.ts"],
      "@core-custom-guards":        ["libs/@oc/server-core/custom-guards/index.ts"],
      "@core-shared-modules":       ["libs/@oc/server-core/shared-modules/index.ts"]
    }
  }
}
```

**Also update `tsconfig.build.json`** to extend the new config and exclude `libs` test files:

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "test", "dist", "**/*spec.ts"]
}
```

> `noImplicitAny` is now `true` — the boilerplate requires zero `any` types.

---

## Step 3 — Update `nest-cli.json`

Register the `libs/` directory so NestJS CLI knows about it and so `tsconfig-paths` is used at runtime.

**Replace `nest-cli.json` with:**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "plugins": ["@nestjs/swagger"]
  }
}
```

---

## Step 4 — Update `package.json` Scripts

Add the TypeORM migration scripts. Also wire `tsconfig-paths` into the start scripts explicitly for path-alias resolution.

In `package.json`, replace the `"scripts"` block with:

```json
"scripts": {
  "build": "nest build",
  "format": "prettier --write \"src/**/*.ts\" \"libs/**/*.ts\" \"test/**/*.ts\"",
  "start": "nest start",
  "start:dev": "nest start --watch",
  "start:debug": "nest start --debug --watch",
  "start:prod": "node dist/main",
  "lint": "eslint \"{src,libs,test}/**/*.ts\" --fix",
  "test": "jest",
  "test:watch": "jest --watch",
  "test:cov": "jest --coverage",
  "test:e2e": "jest --config ./test/jest-e2e.json",
  "typeorm": "ts-node -r tsconfig-paths/register -e \"require('typeorm/cli')\"",
  "migration:generate": "npm run typeorm -- migration:generate",
  "migration:run": "npm run typeorm -- migration:run -d libs/@oc/server-core/database/data-source.ts",
  "migration:revert": "npm run typeorm -- migration:revert -d libs/@oc/server-core/database/data-source.ts"
}
```

Also update the `"jest"` block to resolve path aliases in tests:

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["src/**/*.(t|j)s", "libs/**/*.(t|j)s"],
  "coverageDirectory": "./coverage",
  "testEnvironment": "node",
  "roots": ["<rootDir>/src", "<rootDir>/libs"],
  "moduleNameMapper": {
    "^@business-core-dto$":      "<rootDir>/libs/@oc/business-core/dto/index.ts",
    "^@business-core-modules$":  "<rootDir>/libs/@oc/business-core/modules/index.ts",
    "^@core-database$":          "<rootDir>/libs/@oc/server-core/database/index.ts",
    "^@core-enums$":             "<rootDir>/libs/@oc/server-core/enums/index.ts",
    "^@core-constants$":         "<rootDir>/libs/@oc/server-core/constants/index.ts",
    "^@core-utilities$":         "<rootDir>/libs/@oc/server-core/utilities/index.ts",
    "^@core-custom-validators$": "<rootDir>/libs/@oc/server-core/custom-validators/index.ts",
    "^@core-custom-decorators$": "<rootDir>/libs/@oc/server-core/custom-decorators/index.ts",
    "^@core-custom-guards$":     "<rootDir>/libs/@oc/server-core/custom-guards/index.ts",
    "^@core-shared-modules$":    "<rootDir>/libs/@oc/server-core/shared-modules/index.ts"
  }
}
```

---

## Step 5 — Create the Full Directory Tree

Run these commands from the project root:

```bash
# API layer
mkdir -p src/modules

# Business logic layer
mkdir -p libs/@oc/business-core/dto
mkdir -p libs/@oc/business-core/modules

# Infrastructure — database
mkdir -p libs/@oc/server-core/database/entities
mkdir -p libs/@oc/server-core/database/migrations/database-changes
mkdir -p libs/@oc/server-core/database/migrations/seeds
mkdir -p libs/@oc/server-core/database/migrations/functions

# Infrastructure — shared
mkdir -p libs/@oc/server-core/enums
mkdir -p libs/@oc/server-core/constants
mkdir -p libs/@oc/server-core/utilities
mkdir -p libs/@oc/server-core/custom-validators
mkdir -p libs/@oc/server-core/custom-decorators
mkdir -p libs/@oc/server-core/custom-guards
mkdir -p libs/@oc/server-core/shared-modules
```

---

## Step 6 — Set Up `libs/@oc/server-core/`

### 6a. Enums

**`libs/@oc/server-core/enums/index.ts`**
```typescript
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum UserType {
  ADMIN = 'admin',
  STANDARD = 'standard',
}

export enum FieldTypeEnum {
  String = 'String',
  Number = 'Number',
  UUID = 'UUID',
  Date = 'Date',
  Boolean = 'Boolean',
  Array = 'Array',
}
```

---

### 6b. Constants

**`libs/@oc/server-core/constants/index.ts`**
```typescript
export const UserEntityConstant = {
  FirstNameMaxLength: 100,
  LastNameMaxLength: 100,
  EmailMaxLength: 255,
  PasswordMaxLength: 255,
};

export enum DatabaseUniqueKey {
  UserEmailUserType = 'UQ_user_email_user_type_deleted_at',
}

export enum ModuleName {
  USER = 'user',
}

export const SuccessConstant = {
  AddSuccessAction:    'ADD_SUCCESS',
  UpdateSuccessAction: 'UPDATE_SUCCESS',
  RemoveSuccessAction: 'REMOVE_SUCCESS',
  DetailFetch:         'DETAIL_FETCH',
  ListFetch:           'LIST_FETCH',
  SuccessAction:       'SUCCESS',
};

export function MapToModuleName(module: ModuleName): string {
  const map: Record<ModuleName, string> = {
    [ModuleName.USER]: 'User',
  };
  return map[module];
}
```

---

### 6c. Utilities

**`libs/@oc/server-core/utilities/index.ts`**
```typescript
export function GenerateLogPrefix(module: string, method: string): string {
  return `[${module}::${method}]`;
}
```

---

### 6d. Custom Validators

**`libs/@oc/server-core/custom-validators/index.ts`**

Each validator is a custom decorator that replaces `class-validator` decorators. Below is the minimal set to get started.

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { FieldTypeEnum } from '@core-enums';

// ─── @ValidateNotEmpty ────────────────────────────────────────────────────────

export function ValidateNotEmpty(options?: {
  constraints?: { field: string };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateNotEmpty',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_REQUIRED', field: options?.constraints?.field ?? propertyName }),
        ...options?.validationOptions,
      },
      validator: {
        validate(value: any) {
          return value !== null && value !== undefined && value !== '';
        },
      },
    });
  };
}

// ─── @ValidateType ────────────────────────────────────────────────────────────

export function ValidateType(options?: {
  constraints?: { field: string; type: FieldTypeEnum };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateType',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_TYPE', field: options?.constraints?.field ?? propertyName }),
        ...options?.validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (value === undefined || value === null) return true;
          const type = options?.constraints?.type;
          if (type === FieldTypeEnum.String)  return typeof value === 'string';
          if (type === FieldTypeEnum.Number)  return typeof value === 'number';
          if (type === FieldTypeEnum.Boolean) return typeof value === 'boolean';
          if (type === FieldTypeEnum.UUID) {
            return typeof value === 'string' &&
              /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
          }
          return true;
        },
      },
    });
  };
}

// ─── @ValidateOptional ────────────────────────────────────────────────────────

export function ValidateOptional(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateOptional',
      target: (object as any).constructor,
      propertyName,
      options: { ...validationOptions },
      validator: {
        validate() { return true; },
      },
    });
  };
}

// ─── @ValidateEmail ───────────────────────────────────────────────────────────

export function ValidateEmail(options?: {
  constraints?: { field: string };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateEmail',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_NOT_VALID', field: options?.constraints?.field ?? propertyName }),
        ...options?.validationOptions,
      },
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
      },
    });
  };
}

// ─── @ValidateMinLength ───────────────────────────────────────────────────────

export function ValidateMinLength(options: {
  constraints: { field: string; min: number };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateMinLength',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_MIN_LENGTH', field: options.constraints.field, min: options.constraints.min }),
        ...options.validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return true;
          return value.length >= options.constraints.min;
        },
      },
    });
  };
}

// ─── @ValidateMaxLength ───────────────────────────────────────────────────────

export function ValidateMaxLength(options: {
  constraints: { field: string; max: number };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateMaxLength',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_MAX_LENGTH', field: options.constraints.field, max: options.constraints.max }),
        ...options.validationOptions,
      },
      validator: {
        validate(value: any) {
          if (typeof value !== 'string') return true;
          return value.length <= options.constraints.max;
        },
      },
    });
  };
}

// ─── @ValidateEnumType ────────────────────────────────────────────────────────

export function ValidateEnumType(options: {
  constraints: { field: string; enum: object };
  validationOptions?: ValidationOptions;
}) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'ValidateEnumType',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: JSON.stringify({ key: 'ERR_IS_ENUM', field: options.constraints.field }),
        ...options.validationOptions,
      },
      validator: {
        validate(value: any) {
          if (value === undefined || value === null) return true;
          return Object.values(options.constraints.enum).includes(value);
        },
      },
    });
  };
}
```

---

### 6e. Custom Decorators

**`libs/@oc/server-core/custom-decorators/index.ts`**
```typescript
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

### 6f. Custom Guards

**`libs/@oc/server-core/custom-guards/index.ts`**
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@core-custom-decorators';

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

---

### 6g. Shared Modules

**`libs/@oc/server-core/shared-modules/index.ts`**
```typescript
export * from './typeorm-shared.module';
```

**`libs/@oc/server-core/shared-modules/typeorm-shared.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.name'),
        entities: [__dirname + '/../database/entities/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../database/migrations/**/*{.ts,.js}'],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
  ],
})
export class TypeOrmSharedModule {}
```

---

## Step 7 — Set Up `libs/@oc/server-core/database/`

### 7a. Data Source (for migration CLI)

**`libs/@oc/server-core/database/data-source.ts`**
```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'enterprise_db',
  entities: [__dirname + '/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  synchronize: false,
});
```

### 7b. Database Barrel

**`libs/@oc/server-core/database/index.ts`**
```typescript
export * from './data-source';
export * from './entities/index';
```

**`libs/@oc/server-core/database/entities/index.ts`**
```typescript
// Export all entities here as they are created
// export * from './user.entity';
```

---

## Step 8 — Set Up `libs/@oc/business-core/`

### 8a. AppResponse & Common DTOs

**`libs/@oc/business-core/dto/app-response.dto.ts`**
```typescript
export class AppResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta?: Record<string, unknown>;

  constructor(message: string, data: T, meta?: Record<string, unknown>) {
    this.success = true;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }
}
```

**`libs/@oc/business-core/dto/common-search-response.dto.ts`**
```typescript
export class CommonSearchResponseDto<T> {
  items: T[];
  total: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;

  constructor(items: T[], pageSize: number, pageNumber: number, total: number) {
    this.items = items;
    this.total = total;
    this.pageSize = pageSize;
    this.pageNumber = pageNumber;
    this.totalPages = Math.ceil(total / pageSize);
  }
}
```

**`libs/@oc/business-core/dto/index.ts`**
```typescript
export * from './app-response.dto';
export * from './common-search-response.dto';
```

### 8b. Business Modules Barrel

**`libs/@oc/business-core/modules/index.ts`**
```typescript
// Export all business module exports here as they are created
// export * from './users';
```

---

## Step 9 — Update `src/main.ts`

**`src/main.ts`**
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Enterprise API')
    .setDescription('Enterprise NestJS API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

---

## Step 10 — Update `src/app.module.ts`

**`src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // TypeOrmSharedModule — uncomment once .env is configured:
    // TypeOrmSharedModule,
    //
    // Feature modules go here:
    // UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
```

---

## Step 11 — Add `.env` File

Create `.env` in the project root (also add to `.gitignore`):

```
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=yourpassword
DB_NAME=enterprise_db

JWT_SECRET=replace_with_strong_secret
JWT_EXPIRES_IN=1d
JWT_REFRESH_SECRET=replace_with_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
```

Verify `.env` is in `.gitignore`:
```bash
echo ".env" >> .gitignore
```

---

## Step 12 — Verify the Build

```bash
npm run build
```

Expected output: no errors, `dist/` is generated.

```bash
npm run start:dev
```

Visit `http://localhost:3000/api/docs` — Swagger UI should load.

---

## Step 13 — Create Your First Feature Module (Users)

Use this as the reference template for every subsequent module.

### 13a. Entity

**`libs/@oc/server-core/database/entities/user.entity.ts`**
```typescript
import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { UserStatus, UserType } from '@core-enums';
import { DatabaseUniqueKey, UserEntityConstant } from '@core-constants';

@Entity('user')
@Unique(DatabaseUniqueKey.UserEmailUserType, ['email', 'userType', 'deletedAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: UserEntityConstant.FirstNameMaxLength, name: 'first_name', nullable: false })
  firstName: string;

  @Column({ type: 'varchar', length: UserEntityConstant.LastNameMaxLength, name: 'last_name', nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: UserEntityConstant.EmailMaxLength, name: 'email', nullable: false })
  email: string;

  @Column({ type: 'varchar', length: UserEntityConstant.PasswordMaxLength, name: 'password', nullable: false, select: false })
  password: string;

  @Column({ type: 'enum', enum: UserStatus, name: 'status', default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'enum', enum: UserType, name: 'user_type', default: UserType.STANDARD })
  userType: UserType;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

Update the entities barrel:

**`libs/@oc/server-core/database/entities/index.ts`**
```typescript
export * from './user.entity';
```

---

### 13b. Request DTOs

**`libs/@oc/business-core/modules/users/dto/request/create-user.request.dto.ts`**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { ValidateNotEmpty, ValidateType, ValidateEmail, ValidateMaxLength } from '@core-custom-validators';
import { FieldTypeEnum } from '@core-enums';
import { UserEntityConstant } from '@core-constants';

export class CreateUserRequestDto {
  @ApiProperty({ example: 'John' })
  @ValidateNotEmpty({ constraints: { field: 'First name' } })
  @ValidateType({ constraints: { field: 'firstName', type: FieldTypeEnum.String } })
  @ValidateMaxLength({ constraints: { field: 'First name', max: UserEntityConstant.FirstNameMaxLength } })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @ValidateNotEmpty({ constraints: { field: 'Last name' } })
  @ValidateType({ constraints: { field: 'lastName', type: FieldTypeEnum.String } })
  @ValidateMaxLength({ constraints: { field: 'Last name', max: UserEntityConstant.LastNameMaxLength } })
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @ValidateNotEmpty({ constraints: { field: 'Email' } })
  @ValidateEmail({ constraints: { field: 'Email' } })
  email: string;

  @ApiProperty({ example: 'P@ssword123' })
  @ValidateNotEmpty({ constraints: { field: 'Password' } })
  @ValidateType({ constraints: { field: 'password', type: FieldTypeEnum.String } })
  password: string;
}
```

**`libs/@oc/business-core/modules/users/dto/request/list-user.request.dto.ts`**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateOptional, ValidateType } from '@core-custom-validators';
import { FieldTypeEnum } from '@core-enums';
import { Type } from 'class-transformer';

export class ListUserRequestDto {
  @ApiPropertyOptional({ example: 1 })
  @ValidateOptional()
  @ValidateType({ constraints: { field: 'pageNumber', type: FieldTypeEnum.Number } })
  @Type(() => Number)
  pageNumber?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @ValidateOptional()
  @ValidateType({ constraints: { field: 'pageSize', type: FieldTypeEnum.Number } })
  @Type(() => Number)
  pageSize?: number = 10;

  @ApiPropertyOptional({ example: 'john' })
  @ValidateOptional()
  search?: string;
}
```

---

### 13c. Response DTO

**`libs/@oc/business-core/modules/users/dto/response/user.response.dto.ts`**
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@core-database';
import { UserStatus, UserType } from '@core-enums';

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: UserStatus }) status: UserStatus;
  @ApiProperty({ enum: UserType }) userType: UserType;
  @ApiProperty() createdAt: Date;

  constructor(user: User) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.status = user.status;
    this.userType = user.userType;
    this.createdAt = user.createdAt;
    // password intentionally excluded
  }
}
```

**`libs/@oc/business-core/modules/users/dto/index.ts`**
```typescript
export * from './request/create-user.request.dto';
export * from './request/list-user.request.dto';
export * from './response/user.response.dto';
```

---

### 13d. Repository

**`libs/@oc/business-core/modules/users/users.repository.ts`**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@core-database';
import { ListUserRequestDto } from './dto/index';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  async save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.createQueryBuilder('user')
      .select(['user.id', 'user.email', 'user.userType', 'user.status', 'user.password'])
      .where('user.email = :email', { email })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findById(id: string): Promise<User | null> {
    return this.repo.createQueryBuilder('user')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.status', 'user.userType', 'user.createdAt'])
      .where('user.id = :id', { id })
      .andWhere('user.deletedAt IS NULL')
      .getOne();
  }

  async findUsers(query: ListUserRequestDto): Promise<[User[], number]> {
    const { pageNumber = 1, pageSize = 10, search } = query;

    const qb = this.repo.createQueryBuilder('user')
      .select(['user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.status', 'user.userType', 'user.createdAt'])
      .where('user.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.lastName) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    return qb
      .skip((pageNumber - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();
  }
}
```

---

### 13e. Service

**`libs/@oc/business-core/modules/users/users.service.ts`**
```typescript
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserRequestDto, ListUserRequestDto, UserResponseDto } from './dto/index';
import { AppResponse, CommonSearchResponseDto } from '@business-core-dto';
import { SuccessConstant, MapToModuleName, ModuleName } from '@core-constants';
import { GenerateLogPrefix } from '@core-utilities';
import { User } from '@core-database';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserRequestDto): Promise<AppResponse<UserResponseDto>> {
    const prefix = GenerateLogPrefix(UsersService.name, 'create');
    this.logger.log(`${prefix} Creating user: ${dto.email}`);

    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new BadRequestException({ message: 'ERR_EMAIL_EXISTS' });
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({ ...dto, password: hashed });
    const saved = await this.usersRepository.save(user);

    return new AppResponse(
      SuccessConstant.AddSuccessAction,
      new UserResponseDto(saved),
      { module: MapToModuleName(ModuleName.USER) },
    );
  }

  async findList(query: ListUserRequestDto): Promise<AppResponse<CommonSearchResponseDto<UserResponseDto>>> {
    const [users, total] = await this.usersRepository.findUsers(query);
    const dtos = users.map(u => new UserResponseDto(u));
    const response = new CommonSearchResponseDto(dtos, query.pageSize ?? 10, query.pageNumber ?? 1, total);

    return new AppResponse(
      SuccessConstant.ListFetch,
      response,
      { module: MapToModuleName(ModuleName.USER) },
    );
  }

  async findOne(id: string): Promise<AppResponse<UserResponseDto>> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException({ message: 'ERR_MODULE_NOT_FOUND', module: MapToModuleName(ModuleName.USER) });
    }
    return new AppResponse(
      SuccessConstant.DetailFetch,
      new UserResponseDto(user),
      { module: MapToModuleName(ModuleName.USER) },
    );
  }

  // Internal method for cross-module use — returns raw entity, not AppResponse
  async findUserByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }
}
```

**`libs/@oc/business-core/modules/users/index.ts`**
```typescript
export * from './users.service';
export * from './users.repository';
export * from './dto/index';
```

Update the modules barrel:

**`libs/@oc/business-core/modules/index.ts`**
```typescript
export * from './users/index';
```

---

### 13f. Controller

**`src/modules/users/users.controller.ts`**
```typescript
import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from '@business-core-modules';
import { CreateUserRequestDto, ListUserRequestDto, UserResponseDto } from '@business-core-modules';
import { AppResponse, CommonSearchResponseDto } from '@business-core-dto';
// import { JwtAuthGuard } from '@core-custom-guards';

@ApiTags('Users')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserRequestDto): Promise<AppResponse<UserResponseDto>> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListUserRequestDto): Promise<AppResponse<CommonSearchResponseDto<UserResponseDto>>> {
    return this.usersService.findList(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AppResponse<UserResponseDto>> {
    return this.usersService.findOne(id);
  }
}
```

### 13g. Module

**`src/modules/users/users.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService, UsersRepository } from '@business-core-modules';
import { User } from '@core-database';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService],  // Service only — never Repository
})
export class UsersModule {}
```

---

### 13h. Register UsersModule in AppModule

**Update `src/app.module.ts`:**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmSharedModule } from '@core-shared-modules';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmSharedModule,
    UsersModule,
  ],
})
export class AppModule {}
```

---

## Final Directory State

After all steps, the project looks like this:

```
my-enterprise-app-backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   └── modules/
│       └── users/
│           ├── users.controller.ts
│           └── users.module.ts
│
├── libs/@oc/
│   ├── business-core/
│   │   ├── dto/
│   │   │   ├── app-response.dto.ts
│   │   │   ├── common-search-response.dto.ts
│   │   │   └── index.ts
│   │   └── modules/
│   │       ├── users/
│   │       │   ├── dto/
│   │       │   │   ├── request/
│   │       │   │   │   ├── create-user.request.dto.ts
│   │       │   │   │   └── list-user.request.dto.ts
│   │       │   │   ├── response/
│   │       │   │   │   └── user.response.dto.ts
│   │       │   │   └── index.ts
│   │       │   ├── users.service.ts
│   │       │   ├── users.repository.ts
│   │       │   └── index.ts
│   │       └── index.ts
│   │
│   └── server-core/
│       ├── constants/index.ts
│       ├── custom-decorators/index.ts
│       ├── custom-guards/index.ts
│       ├── custom-validators/index.ts
│       ├── enums/index.ts
│       ├── utilities/index.ts
│       ├── shared-modules/
│       │   ├── typeorm-shared.module.ts
│       │   └── index.ts
│       └── database/
│           ├── data-source.ts
│           ├── index.ts
│           ├── entities/
│           │   ├── user.entity.ts
│           │   └── index.ts
│           └── migrations/
│               ├── database-changes/
│               ├── seeds/
│               └── functions/
│
├── .env                  (gitignored)
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

---

## Adding the Next Module (Checklist)

Repeat this pattern for every new domain:

```
[ ] Entity         → libs/@oc/server-core/database/entities/{name}.entity.ts
                     + export in entities/index.ts

[ ] Request DTOs   → libs/@oc/business-core/modules/{name}/dto/request/
[ ] Response DTO   → libs/@oc/business-core/modules/{name}/dto/response/
[ ] DTO barrel     → libs/@oc/business-core/modules/{name}/dto/index.ts

[ ] Repository     → libs/@oc/business-core/modules/{name}/{name}.repository.ts
[ ] Service        → libs/@oc/business-core/modules/{name}/{name}.service.ts
[ ] Module barrel  → libs/@oc/business-core/modules/{name}/index.ts
                     + re-export from libs/@oc/business-core/modules/index.ts

[ ] Controller     → src/modules/{name}/{name}.controller.ts
[ ] NestJS Module  → src/modules/{name}/{name}.module.ts
                     + import in src/app.module.ts
```
