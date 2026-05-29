# 06 — Authentication & Authorization

## JWT Flow

```
1. POST /api/v1/auth/login  { email, password }
2. Server validates credentials → signs accessToken + refreshToken
3. Client stores tokens (httpOnly cookie recommended)
4. Every subsequent request: Authorization: Bearer <accessToken>
5. On 401 → POST /api/v1/auth/refresh with refreshToken cookie
6. On refresh failure → client redirects to login
```

---

## Token Storage Strategy

| Method | XSS Safe | CSRF Safe | Notes |
|---|---|---|---|
| `localStorage` | ❌ No | ✅ Yes | Never store tokens here |
| **HttpOnly Cookie** | ✅ Yes | ❌ No (needs CSRF token) | **Recommended** — browser sends automatically |
| Memory (JS variable) | ✅ Yes | ✅ Yes | Lost on page refresh |
| `sessionStorage` | ❌ No | ✅ Yes | Acceptable for short-lived access tokens |

**Backend recommendation**: Set the access token via `HttpOnly; Secure; SameSite=Strict` cookie. The refresh token should always be HttpOnly — never accessible to JavaScript.

---

## Auth Module Structure

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts           # Validates accessToken
│   └── jwt-refresh.strategy.ts   # Validates refreshToken
├── enums/
│   └── user-role.enum.ts
└── dto/
    ├── login.dto.ts
    ├── register.dto.ts
    └── auth-response.dto.ts
```

---

## User Entity

```typescript
// features/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100, name: 'first_name' })
  firstName: string;

  @Column({ type: 'varchar', length: 100, name: 'last_name' })
  lastName: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.AGENT })
  role: UserRole;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  @Column({ type: 'varchar', name: 'refresh_token_hash', nullable: true, select: false })
  refreshTokenHash: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;
}
```

> `select: false` on `passwordHash` and `refreshTokenHash` means they are never returned in a normal `find()` — they must be explicitly selected when needed.

---

## Auth Service

```typescript
// auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '@features/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return new AuthResponseDto(user, tokens.accessToken, tokens.refreshToken);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepository.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      passwordHash,
    });
    const saved = await this.userRepository.save(user);

    const tokens = await this.generateTokens(saved);
    await this.storeRefreshToken(saved.id, tokens.refreshToken);

    return new AuthResponseDto(saved, tokens.accessToken, tokens.refreshToken);
  }

  async refreshTokens(userId: number, refreshToken: string): Promise<AuthResponseDto> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.refreshTokenHash')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Access denied');
    }

    const refreshTokenValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!refreshTokenValid) throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return new AuthResponseDto(user, tokens.accessToken, tokens.refreshToken);
  }

  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: null });
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
        expiresIn: this.configService.getOrThrow<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.configService.getOrThrow<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, 12);
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }
}
```

---

## JWT Strategies

### Access Token Strategy

```typescript
// auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@features/users/entities/user.entity';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user || user.status === 'inactive') {
      throw new UnauthorizedException();
    }

    return user;  // Attached as request.user
  }
}
```

### Refresh Token Strategy

```typescript
// auth/strategies/jwt-refresh.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.refresh_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.refreshSecret'),
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload): { userId: number; refreshToken: string } {
    const refreshToken = req.cookies?.refresh_token ?? req.headers.authorization?.split(' ')[1];
    return { userId: payload.sub, refreshToken: refreshToken ?? '' };
  }
}
```

---

## Auth Controller

```typescript
// auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@features/users/entities/user.entity';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Post('register')
  @Public()
  @ApiOperation({ summary: 'Register a new account' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Post('refresh')
  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh the access token using the refresh token cookie' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { userId, refreshToken } = req.user as { userId: number; refreshToken: string };
    const result = await this.authService.refreshTokens(userId, refreshToken);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token');
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string): void {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 days
    });
  }
}
```

---

## DTOs

### Login DTO

```typescript
// auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;
}
```

### Auth Response DTO

```typescript
// auth/dto/auth-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { User } from '@features/users/entities/user.entity';

class AuthUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  role: string;

  constructor(user: User) {
    this.id = user.id;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.email = user.email;
    this.role = user.role;
  }
}

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ description: 'Echoed back for non-cookie clients; use cookie in browsers' })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  constructor(user: User, accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.user = new AuthUserDto(user);
  }
}
```

---

## JWT Payload Interface

```typescript
// common/interfaces/jwt-payload.interface.ts
import { UserRole } from '@features/users/entities/user.entity';

export interface JwtPayload {
  sub: number;        // user ID
  email: string;
  role: UserRole;
  iat?: number;       // issued at (added by jwt library)
  exp?: number;       // expires at (added by jwt library)
}
```

---

## Role-Based Access Control

```typescript
// auth/enums/user-role.enum.ts
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  AGENT = 'agent',
}
```

```typescript
// common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@auth/enums/user-role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

Usage in controllers:

```typescript
// Only admins can delete
@Delete(':id')
@Roles(UserRole.ADMIN)
remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
  return this.leadsService.remove(id);
}

// Admins and managers can create
@Post()
@Roles(UserRole.ADMIN, UserRole.MANAGER)
create(@Body() dto: CreateLeadDto): Promise<LeadResponseDto> {
  return this.leadsService.create(dto);
}

// All authenticated users can read
@Get()
findAll(): Promise<LeadResponseDto[]> {
  return this.leadsService.findAll();
}
```

---

## Auth Module Registration

```typescript
// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { User } from '@features/users/entities/user.entity';
import jwtConfig from '@config/jwt.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: () => ({}),   // secrets injected per-call via signAsync options
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

---

## Security Checklist

| Risk | Anti-pattern | Mitigation |
|---|---|---|
| Password stored plain | `user.password = dto.password` | Always `bcrypt.hash()` with salt rounds ≥ 12 |
| JWT secret hardcoded | `secret: 'mysecret'` | Use `configService.getOrThrow('jwt.secret')` |
| Refresh token stored plain | `user.refreshToken = token` | Store bcrypt hash of the token, not the token itself |
| Token exposed to JS | Storing token in `localStorage` | Use HttpOnly cookie for refresh token |
| No expiry on access token | `expiresIn: undefined` | Short-lived access token (15m), longer refresh (7d) |
| Same secret for access and refresh | Reusing `JWT_SECRET` | Use separate secrets: `JWT_SECRET` and `JWT_REFRESH_SECRET` |
| `select: false` skipped on sensitive columns | Normal `find()` returns passwordHash | Always use `select: false` on password/token columns |
| Role check missing | No `@Roles()` on sensitive routes | Apply `@UseGuards(JwtAuthGuard, RolesGuard)` at controller class level |
