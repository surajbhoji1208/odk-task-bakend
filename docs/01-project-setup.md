# 01 — Project Setup

## Overview

This guide bootstraps a production-grade NestJS application from zero using Node 20, PostgreSQL, TypeORM, strict TypeScript, and modern tooling (ESLint, Prettier, Husky). The result is a fully wired API server following the enterprise architecture described in this documentation series.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x LTS | Runtime |
| npm | 10.x | Package manager |
| NestJS CLI | Latest | Scaffolding |
| PostgreSQL | 15.x+ | Database |
| Git | Latest | Version control |

---

## Step 1 — Install Node 20 (via nvm)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v   # v20.x.x
npm -v    # 10.x.x
```

---

## Step 2 — Install NestJS CLI

```bash
npm install -g @nestjs/cli

# Verify
nest --version
```

---

## Step 3 — Create the Project

```bash
nest new my-enterprise-app-backend \
  --package-manager npm \
  --strict

cd my-enterprise-app-backend
```

### What `--strict` enables

| Flag | Effect |
|------|--------|
| `strict: true` | Enables all strict TypeScript checks |
| `noImplicitAny` | Bans `any` type inference |
| `strictNullChecks` | `null`/`undefined` must be handled explicitly |
| `strictFunctionTypes` | Function parameter contravariance enforcement |

---

## Step 4 — Install Core Dependencies

```bash
# TypeORM + PostgreSQL driver
npm install @nestjs/typeorm typeorm pg

# Config module (environment variable management)
npm install @nestjs/config

# Validation (NestJS pipes + class-transformer)
npm install class-validator class-transformer

# JWT Authentication
npm install @nestjs/jwt @nestjs/passport passport passport-jwt
npm install --save-dev @types/passport-jwt

# Swagger documentation
npm install @nestjs/swagger swagger-ui-express

# Security
npm install helmet bcrypt
npm install --save-dev @types/bcrypt
```

---

## Step 5 — Install Development Tooling

```bash
# ESLint
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# Prettier
npm install --save-dev prettier eslint-config-prettier eslint-plugin-prettier

# Husky + lint-staged
npm install --save-dev husky lint-staged

# Initialize Husky
npx husky init
```

---

## Step 6 — Set Up PostgreSQL

### Install PostgreSQL (Ubuntu/Debian)

```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database and User

```bash
sudo -u postgres psql

-- In psql shell:
CREATE DATABASE my_enterprise_db;
CREATE USER app_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE my_enterprise_db TO app_user;
\q
```

### Verify Connection

```bash
psql -U app_user -d my_enterprise_db -h localhost
```

---

## Step 7 — Configure Environment Variables

Create `.env` at the project root:

```env
# Application
NODE_ENV=development
PORT=3000
API_PREFIX=api
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=your_password
DB_NAME=my_enterprise_db
DB_SYNCHRONIZE=false
DB_LOGGING=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_REFRESH_EXPIRES_IN=7d
```

Create `.env.example` (committed to git, no real secrets):

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api
API_VERSION=v1

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=
DB_PASSWORD=
DB_NAME=my_enterprise_db
DB_SYNCHRONIZE=false
DB_LOGGING=true

JWT_SECRET=
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=
JWT_REFRESH_EXPIRES_IN=7d
```

Add `.env` to `.gitignore`:

```gitignore
# Environment
.env
.env.local
.env.production

# Build output
dist/

# Node
node_modules/
```

---

## Step 8 — Configure the App Module

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
        synchronize: configService.get<boolean>('database.synchronize'),
        logging: configService.get<boolean>('database.logging'),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class AppModule {}
```

Create `src/config/database.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  name: process.env.DB_NAME,
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
}));
```

Create `src/config/app.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  apiVersion: process.env.API_VERSION ?? 'v1',
}));
```

---

## Step 9 — Configure main.ts

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') ?? 3000;
  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api';

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? 'https://your-frontend.com' : '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix and versioning
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({ type: VersioningType.URI });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('My Enterprise API')
      .setDescription('Enterprise-grade NestJS REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  await app.listen(port);
  console.log(`Application running on: http://localhost:${port}/${apiPrefix}`);
  console.log(`Swagger docs: http://localhost:${port}/${apiPrefix}/docs`);
}

bootstrap();
```

---

## Step 10 — Configure tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@modules/*": ["src/modules/*"],
      "@features/*": ["src/features/*"],
      "@common/*": ["src/common/*"],
      "@config/*": ["src/config/*"],
      "@database/*": ["src/database/*"],
      "@auth/*": ["src/auth/*"]
    }
  }
}
```

> **Note**: Path aliases (`@modules/*`, `@common/*`, etc.) eliminate deeply nested relative imports like `../../../../services/user.service`.

---

## Step 11 — Configure ESLint

Create `.eslintrc.js`:

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};
```

---

## Step 12 — Configure Prettier

Create `.prettierrc`:

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

---

## Step 13 — Configure Husky + lint-staged

In `package.json`, add:

```json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.json": ["prettier --write"]
  }
}
```

Edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

## Step 14 — Set Up TypeORM Migrations CLI

Add to `package.json` scripts:

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "build": "nest build",
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert"
  }
}
```

Create `src/database/data-source.ts` for the CLI:

```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});
```

---

## Step 15 — Verify Setup

```bash
# Start dev server
npm run start:dev

# Verify API responds
curl http://localhost:3000/api

# Run lint
npm run lint

# Build production
npm run build
```

Expected output on startup:

```
Application running on: http://localhost:3000/api
Swagger docs: http://localhost:3000/api/docs
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Correct approach |
|---|---|
| `DB_SYNCHRONIZE=true` in production | Always `false` in prod — use migrations only |
| Secrets committed to git | Use `.env` (gitignored) + `.env.example` |
| Relative imports (`../../../`) | Use tsconfig path aliases (`@common/*`) |
| Using `process.env` directly in app code | Always go through `ConfigService.get()` |
| Skipping `--strict` | Always enable strict TypeScript |
| `ValidationPipe` without `whitelist: true` | Strips unknown properties automatically |
