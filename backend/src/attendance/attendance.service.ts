import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RoomParticipantEntity, MeetingEntity } from '../database/entities';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  roomId: string;
  roomTitle: string;
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
  durationSeconds: number | null;
  durationMinutes: number | null;
  isKicked: boolean;
}

export interface AttendanceStatistics {
  totalSessions: number;
  totalMinutes: number;
  averageMinutesPerSession: number;
  uniqueUsers: number;
  uniqueRooms: number;
}

export interface UserAttendanceSummary {
  userId: string;
  userName: string;
  userEmail: string;
  totalSessions: number;
  totalMinutes: number;
  lastAttended: Date | null;
}

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(RoomParticipantEntity)
    private readonly participantRepo: Repository<RoomParticipantEntity>,
  ) { }

  /**
   * Get all attendance records with optional filters
   */
  async getAttendanceRecords(filters: {
    userId?: string;
    roomId?: string;
    startDate?: Date;
    endDate?: Date;
    role?: string;
    limit?: number;
    offset?: number;
    hostUserId?: string;
  }): Promise<{ records: AttendanceRecord[]; total: number }> {
    const query = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.user', 'user')
      .leftJoinAndMapOne('rp.room', MeetingEntity, 'room', 'room.id = rp.roomId') // Use mapOne to get room details if needed, or just leftJoin for filtering
      .select([
        'rp.id as id',
        'rp.userId as "userId"',
        'user.displayName as "userName"',
        'user.email as "userEmail"',
        'rp.roomId as "roomId"',
        'room.title as "roomTitle"',
        'rp.role as role',
        'rp.joinedAt as "joinedAt"',
        'rp.leftAt as "leftAt"',
        'rp.durationSeconds as "durationSeconds"',
        'ROUND(rp."durationSeconds"::numeric / 60, 2) as "durationMinutes"',
        'rp.isKicked as "isKicked"',
      ]);

    if (filters.hostUserId) {
      query.andWhere('room."hostId" = :hostUserId', { hostUserId: filters.hostUserId });
    }

    if (filters.userId) {
      query.andWhere('rp.userId = :userId', { userId: filters.userId });
    }

    if (filters.roomId) {
      query.andWhere('rp.roomId = :roomId', { roomId: filters.roomId });
    }

    if (filters.startDate) {
      query.andWhere('rp.joinedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('rp.joinedAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.role) {
      query.andWhere('rp.role = :role', { role: filters.role });
    }

    // Count total before pagination
    const total = await query.getCount();

    // Apply pagination
    if (filters.limit) {
      query.limit(filters.limit);
    }
    if (filters.offset) {
      query.offset(filters.offset);
    }

    query.orderBy('rp.joinedAt', 'DESC');

    const records = await query.getRawMany();

    return { records, total };
  }

  /**
   * Get attendance statistics
   */
  async getAttendanceStatistics(filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    roomId?: string;
    hostUserId?: string;
  }): Promise<AttendanceStatistics> {
    const query = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoin(MeetingEntity, 'room', 'rp.roomId = room.id')
      .select([
        'COUNT(rp.id) as "totalSessions"',
        'SUM(rp."durationSeconds") as "totalSeconds"',
        'COUNT(DISTINCT rp.userId) as "uniqueUsers"',
        'COUNT(DISTINCT rp.roomId) as "uniqueRooms"',
      ])
      .where('rp.leftAt IS NOT NULL'); // Only completed sessions

    if (filters.startDate) {
      query.andWhere('rp.joinedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('rp.joinedAt <= :endDate', { endDate: filters.endDate });
    }

    if (filters.userId) {
      query.andWhere('rp.userId = :userId', { userId: filters.userId });
    }

    if (filters.roomId) {
      query.andWhere('rp.roomId = :roomId', { roomId: filters.roomId });
    }

    if (filters.hostUserId) {
      query.andWhere('room."hostId" = :hostUserId', { hostUserId: filters.hostUserId });
    }

    const result = await query.getRawOne();

    const totalSessions = parseInt(result.totalSessions || '0', 10);
    const totalSeconds = parseInt(result.totalSeconds || '0', 10);
    const totalMinutes = Math.round(totalSeconds / 60);
    const averageMinutesPerSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

    return {
      totalSessions,
      totalMinutes,
      averageMinutesPerSession,
      uniqueUsers: parseInt(result.uniqueUsers || '0', 10),
      uniqueRooms: parseInt(result.uniqueRooms || '0', 10),
    };
  }

  /**
   * Get attendance summary by user
   */
  async getUserAttendanceSummary(filters: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    hostUserId?: string;
  }): Promise<{ users: UserAttendanceSummary[]; total: number }> {
    const query = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoin('rp.user', 'user')
      .leftJoin('rooms', 'room', 'rp.roomId = room.id')
      .select([
        'rp.userId as "userId"',
        'user.displayName as "userName"',
        'user.email as "userEmail"',
        'COUNT(rp.id) as "totalSessions"',
        'SUM(rp."durationSeconds") as "totalSeconds"',
        'MAX(rp.joinedAt) as "lastAttended"',
      ])
      .where('rp.leftAt IS NOT NULL') // Only completed sessions
      .groupBy('rp.userId, user.displayName, user.email');

    if (filters.hostUserId) {
      query.andWhere('room."hostId" = :hostUserId', { hostUserId: filters.hostUserId });
    }

    if (filters.startDate) {
      query.andWhere('rp.joinedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('rp.joinedAt <= :endDate', { endDate: filters.endDate });
    }

    // Count unique users
    const countQuery = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoin('rooms', 'room', 'rp.roomId = room.id')
      .select('COUNT(DISTINCT rp.userId) as count')
      .where('rp.leftAt IS NOT NULL');

    if (filters.hostUserId) {
      countQuery.andWhere('room.hostId = :hostUserId', { hostUserId: filters.hostUserId });
    }

    if (filters.startDate) {
      countQuery.andWhere('rp.joinedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      countQuery.andWhere('rp.joinedAt <= :endDate', { endDate: filters.endDate });
    }

    const countResult = await countQuery.getRawOne();
    const total = parseInt(countResult.count || '0', 10);

    // Apply pagination
    if (filters.limit) {
      query.limit(filters.limit);
    }
    if (filters.offset) {
      query.offset(filters.offset);
    }

    query.orderBy('totalSeconds', 'DESC');

    const results = await query.getRawMany();

    const users = results.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      userEmail: r.userEmail,
      totalSessions: parseInt(r.totalSessions || '0', 10),
      totalMinutes: Math.round(parseInt(r.totalSeconds || '0', 10) / 60),
      lastAttended: r.lastAttended,
    }));

    return { users, total };
  }

  /**
   * Get active sessions (users currently in meetings)
   */
  async getActiveSessions(hostUserId?: string): Promise<AttendanceRecord[]> {
    const query = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.user', 'user')
      .leftJoin('rooms', 'room', 'rp.roomId = room.id')
      .select([
        'rp.id as id',
        'rp.userId as "userId"',
        'user.displayName as "userName"',
        'user.email as "userEmail"',
        'rp.roomId as "roomId"',
        'room.title as "roomTitle"',
        'rp.role as role',
        'rp.joinedAt as "joinedAt"',
        'rp.leftAt as "leftAt"',
        'rp.durationSeconds as "durationSeconds"',
        'NULL as "durationMinutes"',
        'rp.isKicked as "isKicked"',
      ])
      .where('rp.leftAt IS NULL');

    if (hostUserId) {
      query.andWhere('room.hostId = :hostUserId', { hostUserId });
    }

    query.orderBy('rp.joinedAt', 'DESC');

    return query.getRawMany();
  }

  /**
   * Get attendance by room
   */
  async getAttendanceByRoom(roomId: string): Promise<AttendanceRecord[]> {
    const query = this.participantRepo
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.user', 'user')
      .leftJoin('rooms', 'room', 'rp.roomId = room.id')
      .select([
        'rp.id as id',
        'rp.userId as "userId"',
        'user.displayName as "userName"',
        'user.email as "userEmail"',
        'rp.roomId as "roomId"',
        'room.title as "roomTitle"',
        'rp.role as role',
        'rp.joinedAt as "joinedAt"',
        'rp.leftAt as "leftAt"',
        'rp.durationSeconds as "durationSeconds"',
        'ROUND(rp."durationSeconds"::numeric / 60, 2) as "durationMinutes"',
        'rp.isKicked as "isKicked"',
      ])
      .where('rp.roomId = :roomId', { roomId })
      .orderBy('rp.joinedAt', 'ASC');

    return query.getRawMany();
  }
}
