import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities';
import { AuditAction } from '../shared/enums';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditRepo: Repository<AuditLogEntity>,
  ) {}

  async log(params: {
    action: AuditAction;
    userId?: string;
    roomId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<void> {
    try {
      const entry = this.auditRepo.create({
        action: params.action,
        userId: params.userId ?? null,
        roomId: params.roomId ?? null,
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress ?? null,
      });
      await this.auditRepo.save(entry);
    } catch (error) {
      // Audit logging should never crash the main flow
      this.logger.error(
        `Failed to write audit log: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
