import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - NestJS integration for Prisma Client
 * 
 * Features:
 * - Automatic connection management (connect on init, disconnect on destroy)
 * - Connection pooling (configured via DATABASE_URL)
 * - Query logging (dev mode)
 * - Soft delete middleware (auto-filter deleted records)
 * - Error handling middleware
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

    // Register middleware
    this.registerSoftDeleteMiddleware();
    this.registerErrorHandlingMiddleware();
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
   * Soft delete middleware - auto-filter soft-deleted records
   * Applies to User, Room, Recording models
   */
  private registerSoftDeleteMiddleware() {
    this.$use(async (params, next) => {
      // Models with soft delete support
      const softDeleteModels = ['User', 'Room', 'Recording'];

      if (softDeleteModels.includes(params.model ?? '')) {
        // Read operations - add deletedAt: null filter
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          // Modify filter
          params.args.where = {
            ...params.args.where,
            deletedAt: null,
          };
        }

        if (params.action === 'findMany') {
          // Add deletedAt filter if not explicitly provided
          if (!params.args.where?.deletedAt) {
            params.args.where = {
              ...params.args.where,
              deletedAt: null,
            };
          }
        }

        // Write operations - convert delete to update (soft delete)
        if (params.action === 'delete') {
          params.action = 'update';
          params.args.data = { deletedAt: new Date() };
        }

        if (params.action === 'deleteMany') {
          params.action = 'updateMany';
          params.args.data = { deletedAt: new Date() };
        }
      }

      return next(params);
    });
  }

  /**
   * Error handling middleware - convert Prisma errors to readable messages
   */
  private registerErrorHandlingMiddleware() {
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error) {
          const prismaError = error as { code: string; meta?: Record<string, unknown> };
          
          // Unique constraint violation
          if (prismaError.code === 'P2002') {
            const meta = prismaError.meta as { target?: string[] };
            const field = meta.target?.join(', ') ?? 'field';
            throw new Error(`A record with this ${field} already exists`);
          }

          // Foreign key constraint violation
          if (prismaError.code === 'P2003') {
            throw new Error('Cannot perform this operation due to related records');
          }

          // Record not found
          if (prismaError.code === 'P2025') {
            throw new Error('Record not found');
          }
        }

        // Re-throw if not a Prisma error
        throw error;
      }
    });
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
