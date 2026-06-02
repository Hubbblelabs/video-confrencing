import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * PrismaService - NestJS integration for Prisma Client
 * 
 * Features:
 * - Automatic connection management (connect on init, disconnect on destroy)
 * - Connection pooling (configured via DATABASE_URL)
 * - Query logging (dev mode)
 * - Soft delete support (helper methods provided)
 * - Error handling utilities
 * 
 * Note: Prisma 5+ removed $use middleware in favor of client extensions.
 * Soft delete filtering is now done explicitly in queries for better control.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.NODE_ENV === 'production' 
        ? ['error', 'warn']
        : ['query', 'info', 'warn', 'error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL');
  }

  /**
   * Soft delete helper - marks a record as deleted
   * Use this instead of prisma.model.delete() for soft delete models
   */
  async softDelete<T extends { id: string }>(
    model: keyof Pick<PrismaClient, 'user' | 'room' | 'recording' | 'subject' | 'chatMessage'>,
    id: string,
  ): Promise<T> {
    return (this[model] as any).update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get soft delete filter - use in queries to exclude deleted records
   * Example: prisma.user.findMany({ where: { ...prisma.softDeleteFilter() } })
   */
  softDeleteFilter(): { deletedAt: null } {
    return { deletedAt: null };
  }

  /**
   * Handle Prisma errors - convert to readable messages
   * Wrap your Prisma operations with this for better error messages
   */
  handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Unique constraint violation
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        const field = target?.join(', ') ?? 'field';
        throw new Error(`A record with this ${field} already exists`);
      }

      // Foreign key constraint violation
      if (error.code === 'P2003') {
        throw new Error('Cannot perform this operation due to related records');
      }

      // Record not found
      if (error.code === 'P2025') {
        throw new Error('Record not found');
      }

      // Record to delete does not exist
      if (error.code === 'P2016') {
        throw new Error('Record to delete does not exist');
      }
    }

    // Re-throw if not a known Prisma error
    throw error;
  }

  /**
   * Health check - verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error(`Database health check failed: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Clean database (use in tests only!)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Truncate in dependency order (children before parents) to avoid FK violations.
    // Update this list if new tables are added to the schema.
    const tables = [
      'question_upvotes',
      'questions',
      'chat_messages',
      'whiteboard_sessions',
      'transactions',
      'wallet',
      'room_participants',
      'recordings',
      'audit_logs',
      'teacher_subjects',
      'student_subject_access',
      'subjects',
      'meetings',
      'rooms',
      'auth_providers',
      'users',
    ];

    for (const table of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
