import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
    console.log('✅ Prisma connected to PostgreSQL');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('✅ Prisma disconnected from PostgreSQL');
  }

  /**
   * Soft delete helper - marks a record as deleted
   * Use this instead of prisma.model.delete() for soft delete models
   */
  async softDelete<T extends { id: string }>(
    model: keyof Pick<PrismaClient, 'user' | 'room' | 'recording'>,
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
      console.error('Database health check failed:', error);
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

    const tables = ['audit_logs', 'recordings', 'room_participants', 'rooms', 'auth_providers', 'users'];

    for (const table of tables) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }
}
