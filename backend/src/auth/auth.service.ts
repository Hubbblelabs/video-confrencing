import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from '../database/entities';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerifyEmailDto } from './dto';
import { UserRole } from '../shared/enums';
import { MailService } from './mail.service';
import type { JwtPayload } from '../shared/interfaces';

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_EXPIRATION = 60 * 60 * 1000; // 1 hour
const VERIFY_TOKEN_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) { }

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      role: UserRole.STUDENT, // Force STUDENT role; Admin/Teacher must be created manually
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(`User registered: ${saved.id} with role: ${saved.role}`);

    await this.sendVerification(saved.email);

    return this.generateToken(saved);
  }

  async sendVerification(email: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) return;

    const token = crypto.randomBytes(32).toString('hex');
    user.verificationToken = token;
    user.verificationTokenExpires = new Date(Date.now() + VERIFY_TOKEN_EXPIRATION);
    await this.userRepo.save(user);

    await this.mailService.sendVerificationEmail(email, token);
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: {
        verificationToken: dto.token,
      },
    });

    if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    user.emailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await this.userRepo.save(user);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      // Don't leak user existence
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = token;
    user.resetTokenExpires = new Date(Date.now() + RESET_TOKEN_EXPIRATION);
    await this.userRepo.save(user);

    await this.mailService.sendPasswordResetEmail(user.email, token);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({
      where: {
        resetToken: dto.token,
      },
    });

    if (!user || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.resetToken = null;
    user.resetTokenExpires = null;
    await this.userRepo.save(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: ${user.id}`);
    return this.generateToken(user);
  }

  async validateUserById(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({ where: { id: userId, isActive: true } });
  }

  verifyToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  generateToken(user: UserEntity): { accessToken: string } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      emailVerified: user.emailVerified,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
