import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhiteboardSessionEntity } from '../database/entities/whiteboard-session.entity';
import { UserRole } from '../shared/enums';

export interface SaveWhiteboardDto {
  meetingId: string;
  hostId: string;
  title?: string;
  slidesData: Array<{
    slideIndex: number;
    elements: any[];
    thumbnailDataUrl: string | null;
  }>;
  /** base64-encoded PDF */
  pdfBase64: string;
}

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(WhiteboardSessionEntity)
    private readonly repo: Repository<WhiteboardSessionEntity>,
  ) {}

  async save(dto: SaveWhiteboardDto): Promise<WhiteboardSessionEntity> {
    const session = this.repo.create({
      meetingId: dto.meetingId,
      hostId: dto.hostId,
      title: dto.title ?? null,
      slideCount: dto.slidesData.length,
      slidesData: dto.slidesData,
      pdfBase64: dto.pdfBase64,
    });
    return this.repo.save(session);
  }

  async findForMeeting(
    meetingId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<WhiteboardSessionEntity[]> {
    const sessions = await this.repo.find({
      where: { meetingId },
      order: { createdAt: 'ASC' },
      relations: ['host'],
    });

    if (!sessions.length) return [];

    const isAdmin = requestingUserRole === UserRole.ADMIN;
    const isHostOfAny = sessions.some((s) => s.hostId === requestingUserId);

    if (!isAdmin && !isHostOfAny) {
      throw new ForbiddenException('Only the host or admin can view whiteboard sessions');
    }

    // Strip heavy PDF data from list response (only return in single fetch)
    return sessions.map((s) => ({ ...s, pdfBase64: null }) as WhiteboardSessionEntity);
  }

  async findOne(
    id: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<WhiteboardSessionEntity> {
    const session = await this.repo.findOne({ where: { id }, relations: ['host'] });
    if (!session) throw new NotFoundException('Whiteboard session not found');

    const isAdmin = requestingUserRole === UserRole.ADMIN;
    const isHost = session.hostId === requestingUserId;

    if (!isAdmin && !isHost) {
      throw new ForbiddenException('Only the host or admin can access this whiteboard');
    }

    return session;
  }

  /** Returns all whiteboard sessions for meetings hosted by a given teacher */
  async findForTeacher(teacherId: string): Promise<WhiteboardSessionEntity[]> {
    return this.repo.find({
      where: { hostId: teacherId },
      order: { createdAt: 'DESC' },
      relations: ['host'],
      select: {
        id: true,
        meetingId: true,
        hostId: true,
        title: true,
        slideCount: true,
        createdAt: true,
        updatedAt: true,
        // pdfBase64 and slidesData are intentionally excluded (heavy data, use findOne for single fetch)
      },
    });
  }

  /** Admin: all whiteboard sessions across all meetings */
  async findAll(): Promise<WhiteboardSessionEntity[]> {
    return this.repo.find({
      order: { createdAt: 'DESC' },
      relations: ['host'],
      select: {
        id: true,
        meetingId: true,
        hostId: true,
        title: true,
        slideCount: true,
        createdAt: true,
        updatedAt: true,
        // pdfBase64 and slidesData are intentionally excluded (heavy data, use findOne for single fetch)
      },
    });
  }
}
