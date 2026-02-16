import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../database/entities';
import { UserRole } from '../shared/enums';
import { CreateUserDto, UpdateUserDto, UpdateUserRoleDto } from './dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async findAll(role?: UserRole): Promise<UserEntity[]> {
    const query = this.userRepo.createQueryBuilder('user');

    if (role) {
      query.where('user.role = :role', { role });
    }

    query.orderBy('user.createdAt', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      role: dto.role || UserRole.STUDENT,
      isActive: dto.isActive ?? true,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(`User created: ${saved.id} (${saved.email}) with role: ${saved.role}`);

    return saved;
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepo.findOne({
        where: { email: dto.email },
      });

      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    if (dto.displayName) {
      user.displayName = dto.displayName;
    }

    if (dto.email) {
      user.email = dto.email;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    if (dto.isActive !== undefined) {
      user.isActive = dto.isActive;
    }

    const updated = await this.userRepo.save(user);
    this.logger.log(`User updated: ${updated.id}`);

    return updated;
  }

  async updateRole(id: string, dto: UpdateUserRoleDto): Promise<UserEntity> {
    const user = await this.findOne(id);

    if (user.role === dto.role) {
      throw new BadRequestException(`User already has role: ${dto.role}`);
    }

    const oldRole = user.role;
    user.role = dto.role;

    const updated = await this.userRepo.save(user);
    this.logger.log(`User role changed: ${updated.id} from ${oldRole} to ${dto.role}`);

    return updated;
  }

  async delete(id: string): Promise<void> {
    const user = await this.findOne(id);

    await this.userRepo.remove(user);
    this.logger.log(`User deleted: ${id}`);
  }

  async getStatistics() {
    const [total, students, teachers, admins, active, inactive] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { role: UserRole.STUDENT } }),
      this.userRepo.count({ where: { role: UserRole.TEACHER } }),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
      this.userRepo.count({ where: { isActive: true } }),
      this.userRepo.count({ where: { isActive: false } }),
    ]);

    return {
      total,
      students,
      teachers,
      admins,
      active,
      inactive,
    };
  }
}
