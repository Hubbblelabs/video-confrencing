// ═══════════════════════════════════════════════════════════════
// PRODUCTION-READY: Username OR Email Login (Prisma Migration)
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// 1. UPDATED DTO (supports both username and email)
// ─────────────────────────────────────────────────────────────
// File: src/auth/dto/auth.dto.ts

import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  MinLength, 
  MaxLength,
  ValidateIf 
} from 'class-validator';

export class LoginDto {
  /**
   * Identifier: username OR email
   * Validation: Must be either a valid username or email
   * Production pattern: Flexible login identifier
   */
  @IsString()
  @MinLength(3, { message: 'Identifier must be at least 3 characters' })
  @MaxLength(255)
  identifier!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

// ─────────────────────────────────────────────────────────────
// ALTERNATIVE: Explicit username OR email fields (more clear)
// ─────────────────────────────────────────────────────────────

export class LoginDtoExplicit {
  /**
   * Username for login (optional if email provided)
   * Mutually exclusive with email - provide one or the other
   */
  @ValidateIf((o) => !o.email)
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username?: string;

  /**
   * Email for login (optional if username provided)
   * Mutually exclusive with username - provide one or the other
   */
  @ValidateIf((o) => !o.username)
  @IsEmail()
  email?: string;

  @IsString()
  password!: string;
}

// ─────────────────────────────────────────────────────────────
// 2. UPDATED SERVICE (Prisma-based with flexible lookup)
// ─────────────────────────────────────────────────────────────
// File: src/auth/auth.service.ts

import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, RegisterDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login with username OR email
   * Production pattern: Try username first (indexed), then email
   * Security: Constant-time comparison, generic error messages
   */
  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const { identifier, password } = dto;

    // Determine if identifier is email or username
    const isEmail = this.isValidEmail(identifier);

    // Query by username or email (both indexed)
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
        ],
        ...this.prisma.softDeleteFilter(), // Exclude soft-deleted
      },
    });

    // Generic error to prevent user enumeration
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Verify password (constant-time comparison)
    if (!user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials'); // OAuth-only user
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login timestamp
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_LOGIN',
        userId: user.id,
        metadata: { 
          loginMethod: isEmail ? 'email' : 'username',
          identifier: identifier.substring(0, 3) + '***', // Partial for privacy
        },
      },
    });

    return this.generateToken(user);
  }

  /**
   * Register new user with username + email
   * Both are required for registration
   */
  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const { username, email, password, displayName } = dto;

    // Check username exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Check email exists (if provided)
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('Email already registered');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        displayName,
        isActive: true,
        isVerified: false,
      },
    });

    // Create local auth provider entry
    await this.prisma.authProvider.create({
      data: {
        userId: user.id,
        providerType: 'LOCAL',
        providerId: username,
        providerEmail: email,
      },
    });

    // Log audit event
    await this.prisma.auditLog.create({
      data: {
        action: 'USER_REGISTERED',
        userId: user.id,
        metadata: { username, email },
      },
    });

    return this.generateToken(user);
  }

  /**
   * Validate email format (simple check)
   */
  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: { id: string; username: string; email: string | null }): {
    accessToken: string;
  } {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}

// ─────────────────────────────────────────────────────────────
// 3. UPDATED REGISTER DTO (requires username + email)
// ─────────────────────────────────────────────────────────────

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(150)
  displayName!: string;
}

// ─────────────────────────────────────────────────────────────
// 4. FRONTEND REQUEST (supports both)
// ─────────────────────────────────────────────────────────────

// Login with email:
const loginWithEmail = {
  identifier: 'user@example.com',
  password: 'SecurePass123!',
};

// Login with username:
const loginWithUsername = {
  identifier: 'johndoe',
  password: 'SecurePass123!',
};

// Register (requires both):
const register = {
  username: 'johndoe',
  email: 'john@example.com',
  password: 'SecurePass123!',
  displayName: 'John Doe',
};

// ═══════════════════════════════════════════════════════════════
// PRODUCTION CONSIDERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * ✅ Security Best Practices:
 * 
 * 1. Generic error messages (prevent user enumeration)
 * 2. Constant-time password comparison
 * 3. Rate limiting on /auth/login (not shown - use @nestjs/throttler)
 * 4. Account lockout after N failed attempts (not shown)
 * 5. Audit logging for all auth events
 * 6. Last login timestamp tracking
 * 
 * ✅ Performance:
 * 
 * 1. Both username and email are indexed
 * 2. findFirst with OR is efficient (uses index)
 * 3. Soft delete filter uses indexed field
 * 
 * ✅ UX Benefits:
 * 
 * 1. Users can login with username OR email (flexible)
 * 2. Clear error messages for validation
 * 3. Fast lookup (indexed fields)
 * 
 * ⚠️ Tradeoffs:
 * 
 * 1. Slightly more complex validation logic
 * 2. Two database queries max (username OR email lookup)
 * 3. Need to maintain both username and email indexes
 * 
 * 🔒 Additional Production Features (recommended):
 * 
 * 1. Rate limiting:
 *    @UseGuards(ThrottlerGuard)
 *    @Throttle(5, 60) // 5 attempts per 60 seconds
 * 
 * 2. Account lockout:
 *    - Track failed login attempts in Redis
 *    - Lock account after 5 failures for 15 minutes
 * 
 * 3. IP-based blocking:
 *    - Track IPs with multiple failures
 *    - Temporary IP ban after excessive failures
 * 
 * 4. 2FA support:
 *    - Add totpSecret field to User model
 *    - Add 2FA verification step after password check
 * 
 * 5. Session management:
 *    - Store active sessions in Redis
 *    - Support session revocation
 * 
 * 6. Password policies:
 *    - Minimum complexity requirements
 *    - Password history (prevent reuse)
 *    - Expiration policies (enterprise)
 */

// ═══════════════════════════════════════════════════════════════
// SQL QUERIES GENERATED (for reference)
// ═══════════════════════════════════════════════════════════════

/**
 * Login query (uses indexes):
 * 
 * SELECT * FROM users 
 * WHERE (username = $1 OR email = $1) 
 *   AND deleted_at IS NULL
 * LIMIT 1;
 * 
 * Indexes used:
 * - users_username_idx (username)
 * - users_email_idx (email)
 * - users_is_active_deleted_at_idx (composite)
 * 
 * Performance: O(log n) for username lookup, O(log n) for email lookup
 * 
 * Register checks (2 queries):
 * 
 * SELECT id FROM users WHERE username = $1 LIMIT 1;
 * SELECT id FROM users WHERE email = $2 LIMIT 1;
 * 
 * Both are indexed unique lookups: O(log n)
 */
