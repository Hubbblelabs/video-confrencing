import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan, LessThan, Between } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../redis/redis-keys';
import { AuditService } from '../audit/audit.service';
import { MeetingEntity, UserEntity, RoomParticipantEntity, ParticipantRole } from '../database/entities';
import { RoomRole, RoomStatus, AuditAction } from '../shared/enums';
import type { RoomParticipant, RedisRoomState } from '../shared/interfaces';
import { WsRoomException } from '../shared/exceptions';
import { BillingService } from '../billing/billing.service';
import { UserRole } from '../shared/enums';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly maxParticipants: number;

  constructor(
    @InjectRepository(MeetingEntity)
    private readonly meetingRepo: Repository<MeetingEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RoomParticipantEntity)
    private readonly roomParticipantRepo: Repository<RoomParticipantEntity>,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly billing: BillingService,
  ) {
    this.maxParticipants = this.config.get<number>('room.maxParticipants', 100);
  }

  /**
   * Creates a new room in both PostgreSQL (persistence) and Redis (live state).
   */
  async createRoom(params: {
    hostUserId: string;
    title: string;
    maxParticipants?: number;
    allowScreenShare?: boolean;
    allowWhiteboard?: boolean;
  }): Promise<{ roomId: string; roomCode: string }> {
    const roomCode = this.generateRoomCode();
    const max = Math.min(params.maxParticipants ?? this.maxParticipants, 500);

    // Persist to PostgreSQL
    const meeting = this.meetingRepo.create({
      title: params.title,
      roomCode,
      hostId: params.hostUserId,
      status: RoomStatus.WAITING,
      maxParticipants: max,
      allowScreenShare: params.allowScreenShare ?? true,
      allowWhiteboard: params.allowWhiteboard ?? true,
    });
    const saved = await this.meetingRepo.save(meeting);

    // Initialize Redis state
    const roomState: Record<string, string> = {
      roomId: saved.id,
      roomCode: roomCode,
      hostUserId: params.hostUserId,
      status: RoomStatus.WAITING,
      createdAt: String(Date.now()),
      maxParticipants: String(max),
      routerId: '',
      allowScreenShare: String(params.allowScreenShare ?? true),
      allowWhiteboard: String(params.allowWhiteboard ?? true),
    };

    const pipeline = this.redis.pipeline();
    pipeline.hmset(RedisKeys.room(saved.id), roomState);
    pipeline.expire(RedisKeys.room(saved.id), RedisKeys.ROOM_TTL);
    pipeline.sadd(RedisKeys.activeRooms, saved.id);
    pipeline.set(RedisKeys.roomCodeToId(roomCode), saved.id, 'EX', RedisKeys.ROOM_TTL);
    await pipeline.exec();

    await this.audit.log({
      action: AuditAction.ROOM_CREATED,
      userId: params.hostUserId,
      roomId: saved.id,
      metadata: { title: params.title, roomCode, maxParticipants: max },
    });

    this.logger.log(`Room created: ${saved.id} (code: ${roomCode}) by user ${params.hostUserId}`);
    return { roomId: saved.id, roomCode };
  }

  /**
   * Resolves a Room ID from a potential Room Code or UUID.
   */
  async resolveRoomId(idOrCode: string): Promise<string | null> {
    // If it looks like a UUID, check if it exists directly
    if (idOrCode.length > 20 && idOrCode.includes('-')) {
      const exists = await this.redis.exists(RedisKeys.room(idOrCode));
      if (exists) return idOrCode;
    }

    // Otherwise, try to lookup by code
    const mappedId = await this.redis.get(RedisKeys.roomCodeToId(idOrCode));
    return mappedId || (idOrCode.length > 20 ? idOrCode : null);
  }

  /**
   * Adds a participant to a room in Redis. Enforces max participant limit.
   * If room doesn't exist, creates it automatically with a generated UUID.
   */
  async joinRoom(params: {
    roomId: string; // Can be UUID or Code
    userId: string;
    socketId: string;
  }): Promise<{ roomId: string; roomCode: string; role: RoomRole; participants: RoomParticipant[] }> {
    let actualRoomId = await this.resolveRoomId(params.roomId) || params.roomId;
    let roomData = await this.redis.hgetall(RedisKeys.room(actualRoomId));

    // If room doesn't exist, create it automatically
    if (!roomData || !roomData['roomId']) {
      // Logic for auto-creation (only if it looks like a UUID or we decide to support auto-create by code - usually auto-create is for dev/testing with UUIDs)
      this.logger.log(`Room ${params.roomId} not found, creating automatically...`);

      const roomCode = this.generateRoomCode();

      // Persist to PostgreSQL - let TypeORM generate the UUID automatically
      const meeting = this.meetingRepo.create({
        title: `Room ${params.roomId}`,
        roomCode,
        hostId: params.userId,
        status: RoomStatus.WAITING,
        maxParticipants: this.maxParticipants,
      });
      const saved = await this.meetingRepo.save(meeting);

      // Use the generated UUID as the actual room ID
      actualRoomId = saved.id;

      // Initialize Redis state with the generated UUID
      const roomState: Record<string, string> = {
        roomId: actualRoomId,
        roomCode,
        hostUserId: params.userId,
        status: RoomStatus.WAITING,
        createdAt: String(Date.now()),
        maxParticipants: String(this.maxParticipants),
        routerId: '',
        allowScreenShare: 'true',
        allowWhiteboard: 'true',
      };

      const pipeline = this.redis.pipeline();
      pipeline.hmset(RedisKeys.room(actualRoomId), roomState);
      pipeline.expire(RedisKeys.room(actualRoomId), RedisKeys.ROOM_TTL);
      pipeline.sadd(RedisKeys.activeRooms, actualRoomId);
      pipeline.set(RedisKeys.roomCodeToId(roomCode), actualRoomId, 'EX', RedisKeys.ROOM_TTL);
      await pipeline.exec();

      await this.audit.log({
        action: AuditAction.ROOM_CREATED,
        userId: params.userId,
        roomId: actualRoomId,
        metadata: {
          title: saved.title,
          roomCode,
          maxParticipants: this.maxParticipants,
          autoCreated: true,
          requestedRoomId: params.roomId, // Track what user requested
        },
      });

      this.logger.log(`Room auto-created with ID ${actualRoomId} (code: ${roomCode}) by user ${params.userId}`);

      // Reload room data with the actual room ID
      roomData = await this.redis.hgetall(RedisKeys.room(actualRoomId));
    }

    if (roomData['status'] === RoomStatus.CLOSED) {
      throw new WsRoomException('Room is closed');
    }

    const currentCount = await this.redis.hlen(RedisKeys.roomParticipants(actualRoomId));
    const maxP = parseInt(roomData['maxParticipants'] || '100', 10);

    if (currentCount >= maxP) {
      throw new WsRoomException('Room is full');
    }

    // Check if user is the host
    const isHost = roomData['hostUserId'] === params.userId;
    const role = isHost ? RoomRole.HOST : RoomRole.PARTICIPANT;

    // Fetch user's display name from database
    const user = await this.userRepo.findOne({ where: { id: params.userId } });
    const displayName = user?.displayName || 'Unknown User';

    // Check if student has at least 1 credit to join
    if (user && user.role === UserRole.STUDENT && !isHost) {
      const wallet = await this.billing.getOrCreateWallet(params.userId);
      if (wallet.balance < 1) {
        throw new WsRoomException('Insufficient credits to join this session');
      }
    }

    const participant: RoomParticipant = {
      userId: params.userId,
      displayName,
      socketId: params.socketId,
      role,
      joinedAt: Date.now(),
      producerIds: [],
      isMuted: false,
      isVideoOff: false,
    };

    // Store in Redis with pipeline (idempotent — safe to re-run on retry)
    // hget returns null if not set, non-null if the user is already a participant
    const existingParticipantData = await this.redis.hget(RedisKeys.roomParticipants(actualRoomId), params.userId);
    const alreadyJoined = existingParticipantData !== null;

    const pipeline = this.redis.pipeline();
    pipeline.hset(
      RedisKeys.roomParticipants(actualRoomId),
      params.userId,
      JSON.stringify(participant),
    );
    pipeline.set(RedisKeys.socketToUser(params.socketId), params.userId, 'EX', RedisKeys.SOCKET_TTL);
    pipeline.set(RedisKeys.userToSocket(params.userId), params.socketId, 'EX', RedisKeys.SOCKET_TTL);

    // Activate room on first join
    if (roomData['status'] === RoomStatus.WAITING && isHost) {
      pipeline.hset(RedisKeys.room(actualRoomId), 'status', RoomStatus.ACTIVE);
    }
    await pipeline.exec();

    // Create attendance record in PostgreSQL — use upsert to handle concurrent retries gracefully
    if (!alreadyJoined) {
      try {
        const participantRole = isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT;
        const attendanceRecord = this.roomParticipantRepo.create({
          userId: params.userId,
          roomId: actualRoomId,
          role: participantRole,
          joinedAt: new Date(),
        });
        await this.roomParticipantRepo.save(attendanceRecord);
        this.logger.log(`Attendance record created for user ${params.userId} in room ${actualRoomId}`);
      } catch (error) {
        const errorMsg = (error as Error).message;
        if (!errorMsg.includes('duplicate key')) {
          this.logger.error(`Failed to create attendance record: ${errorMsg}`);
        }
        // Duplicate key = already recorded from a previous join attempt, safe to ignore
      }
    } else {
      this.logger.debug(`User ${params.userId} re-joined room ${actualRoomId} (socket updated, skipping duplicate attendance record)`);
    }

    // Update peak participants
    const newCount = currentCount + 1;
    await this.meetingRepo
      .createQueryBuilder()
      .update()
      .set({
        peakParticipants: () => `GREATEST("peakParticipants", ${newCount})`,
        startedAt: () => `COALESCE("startedAt", NOW())`,
      })
      .where('id = :id', { id: actualRoomId })
      .execute();

    await this.audit.log({
      action: AuditAction.USER_JOINED,
      userId: params.userId,
      roomId: actualRoomId,
      metadata: { role, socketId: params.socketId },
    });

    const participants = await this.getParticipants(actualRoomId);
    return { roomId: actualRoomId, roomCode: roomData['roomCode'], role, participants };
  }

  /**
   * Removes a participant from a room. If last participant, auto-cleans the room.
   */
  async leaveRoom(params: {
    roomId: string;
    userId: string;
    socketId: string;
  }): Promise<{ roomClosed: boolean; remainingParticipants: RoomParticipant[] }> {
    const pipeline = this.redis.pipeline();
    pipeline.hdel(RedisKeys.roomParticipants(params.roomId), params.userId);
    pipeline.del(RedisKeys.socketToUser(params.socketId));
    pipeline.del(RedisKeys.userToSocket(params.userId));
    await pipeline.exec();

    // Update attendance record with leave time and calculate duration
    try {
      const attendanceRecord = await this.roomParticipantRepo.findOne({
        where: {
          userId: params.userId,
          roomId: params.roomId,
          leftAt: null as any, // Still in the room
        },
        order: {
          joinedAt: 'DESC', // Get the most recent join
        },
      });

      if (attendanceRecord) {
        const leftAt = new Date();
        const durationMs = leftAt.getTime() - attendanceRecord.joinedAt.getTime();
        const durationSeconds = Math.floor(durationMs / 1000);

        attendanceRecord.leftAt = leftAt;
        attendanceRecord.durationSeconds = durationSeconds;
        await this.roomParticipantRepo.save(attendanceRecord);

        this.logger.log(
          `Attendance record updated for user ${params.userId} in room ${params.roomId}. Duration: ${durationSeconds}s`,
        );

        // Deduct credits: 1 credit per minute (rounded up)
        const creditsToDeduct = Math.ceil(durationSeconds / 60);
        if (creditsToDeduct > 0) {
          try {
            await this.billing.debitCredits({
              userId: params.userId,
              amount: creditsToDeduct,
              meetingId: params.roomId,
              metadata: { durationSeconds, reason: 'meeting_usage' },
            });
            this.logger.log(
              `Debited ${creditsToDeduct} credits from user ${params.userId} for ${durationSeconds}s in room ${params.roomId}`,
            );
          } catch (e) {
            this.logger.warn(
              `Credit deduction failed for user ${params.userId}: ${(e as Error).message}`,
            );
          }
        }
      } else {
        this.logger.warn(
          `No active attendance record found for user ${params.userId} in room ${params.roomId}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to update attendance record: ${(error as Error).message}`);
      // Don't fail the leave if attendance tracking fails
    }

    const remaining = await this.redis.hlen(RedisKeys.roomParticipants(params.roomId));

    await this.audit.log({
      action: AuditAction.USER_LEFT,
      userId: params.userId,
      roomId: params.roomId,
    });

    let roomClosed = false;
    if (remaining === 0) {
      await this.closeRoom(params.roomId, params.userId);
      roomClosed = true;
    }

    const remainingParticipants = roomClosed ? [] : await this.getParticipants(params.roomId);

    this.logger.log(`User ${params.userId} left room ${params.roomId}. Closed: ${roomClosed}`);
    return { roomClosed, remainingParticipants };
  }

  /**
   * Closes a room permanently.
   */
  async closeRoom(roomId: string, closedByUserId: string): Promise<void> {
    const pipeline = this.redis.pipeline();
    const roomData = await this.redis.hgetall(RedisKeys.room(roomId));
    if (roomData && roomData['roomCode']) {
      pipeline.del(RedisKeys.roomCodeToId(roomData['roomCode']));
    }
    pipeline.del(RedisKeys.room(roomId));
    pipeline.del(RedisKeys.roomParticipants(roomId));
    pipeline.srem(RedisKeys.activeRooms, roomId);
    await pipeline.exec();

    await this.meetingRepo.update(roomId, {
      status: RoomStatus.CLOSED,
      endedAt: new Date(),
    });

    await this.audit.log({
      action: AuditAction.ROOM_CLOSED,
      userId: closedByUserId,
      roomId,
    });

    this.logger.log(`Room closed: ${roomId}`);
  }

  /**
   * Kicks a user from a room. Host-only action.
   */
  async kickUser(params: {
    roomId: string;
    requestingUserId: string;
    targetUserId: string;
  }): Promise<{ kickedSocketId: string | null }> {
    await this.assertHostOrCoHost(params.roomId, params.requestingUserId);

    const participantData = await this.redis.hget(
      RedisKeys.roomParticipants(params.roomId),
      params.targetUserId,
    );

    if (!participantData) {
      throw new WsRoomException('User not found in room');
    }

    const participant: RoomParticipant = JSON.parse(participantData);

    if (participant.role === RoomRole.HOST) {
      throw new WsRoomException('Cannot kick the host');
    }

    const pipeline = this.redis.pipeline();
    pipeline.hdel(RedisKeys.roomParticipants(params.roomId), params.targetUserId);
    pipeline.del(RedisKeys.socketToUser(participant.socketId));
    pipeline.del(RedisKeys.userToSocket(params.targetUserId));
    await pipeline.exec();

    await this.audit.log({
      action: AuditAction.USER_KICKED,
      userId: params.requestingUserId,
      roomId: params.roomId,
      metadata: { targetUserId: params.targetUserId },
    });

    return { kickedSocketId: participant.socketId };
  }

  /**
   * Mutes all participants except the host.
   */
  async muteAll(roomId: string, requestingUserId: string): Promise<string[]> {
    await this.assertHostOrCoHost(roomId, requestingUserId);

    const participantsMap = await this.redis.hgetall(RedisKeys.roomParticipants(roomId));
    const mutedSocketIds: string[] = [];

    const pipeline = this.redis.pipeline();
    for (const [userId, data] of Object.entries(participantsMap)) {
      const participant: RoomParticipant = JSON.parse(data);
      if (participant.role !== RoomRole.HOST) {
        participant.isMuted = true;
        pipeline.hset(
          RedisKeys.roomParticipants(roomId),
          userId,
          JSON.stringify(participant),
        );
        mutedSocketIds.push(participant.socketId);
      }
    }
    await pipeline.exec();

    await this.audit.log({
      action: AuditAction.ALL_MUTED,
      userId: requestingUserId,
      roomId,
    });

    return mutedSocketIds;
  }

  /**
   * Toggles the hand raise status of a participant.
   */
  async toggleHandRaise(roomId: string, userId: string): Promise<boolean> {
    const participantData = await this.redis.hget(
      RedisKeys.roomParticipants(roomId),
      userId,
    );

    if (!participantData) {
      throw new WsRoomException('User not found in room');
    }

    const participant: RoomParticipant = JSON.parse(participantData);
    participant.handRaised = !participant.handRaised;

    await this.redis.hset(
      RedisKeys.roomParticipants(roomId),
      userId,
      JSON.stringify(participant),
    );

    await this.audit.log({
      action: AuditAction.HAND_RAISE_TOGGLED,
      userId,
      roomId,
      metadata: { handRaised: participant.handRaised },
    });

    return !!participant.handRaised;
  }

  /**
   * Updates a participant's media state (muted or video off).
   */
  async updateParticipantMedia(
    roomId: string,
    userId: string,
    kind: 'audio' | 'video',
    isPaused: boolean,
  ): Promise<void> {
    const participantData = await this.redis.hget(
      RedisKeys.roomParticipants(roomId),
      userId,
    );

    if (!participantData) return;

    const participant: RoomParticipant = JSON.parse(participantData);

    if (kind === 'audio') {
      participant.isMuted = isPaused;
    } else if (kind === 'video') {
      participant.isVideoOff = isPaused;
    }

    await this.redis.hset(
      RedisKeys.roomParticipants(roomId),
      userId,
      JSON.stringify(participant),
    );

    this.logger.log(`Updated media state for user ${userId} in room ${roomId}: ${kind}=${isPaused ? 'paused' : 'resumed'}`);
  }

  /**
   * Changes a participant's role. Host-only action.
   */
  async changeRole(params: {
    roomId: string;
    requestingUserId: string;
    targetUserId: string;
    newRole: RoomRole;
  }): Promise<void> {
    await this.assertHost(params.roomId, params.requestingUserId);

    if (params.newRole === RoomRole.HOST) {
      throw new WsRoomException('Cannot assign host role');
    }

    const participantData = await this.redis.hget(
      RedisKeys.roomParticipants(params.roomId),
      params.targetUserId,
    );

    if (!participantData) {
      throw new WsRoomException('User not found in room');
    }

    const participant: RoomParticipant = JSON.parse(participantData);
    participant.role = params.newRole;

    await this.redis.hset(
      RedisKeys.roomParticipants(params.roomId),
      params.targetUserId,
      JSON.stringify(participant),
    );

    await this.audit.log({
      action: AuditAction.ROLE_CHANGED,
      userId: params.requestingUserId,
      roomId: params.roomId,
      metadata: { targetUserId: params.targetUserId, newRole: params.newRole },
    });
  }

  /**
   * Gets all participants in a room from Redis.
   */
  async getParticipants(roomId: string): Promise<RoomParticipant[]> {
    const participantsMap = await this.redis.hgetall(RedisKeys.roomParticipants(roomId));
    return Object.values(participantsMap).map(
      (data) => JSON.parse(data) as RoomParticipant,
    );
  }

  /**
   * Gets the room ID for a given user if they are in any room.
   */
  async getRoomIdByUserId(userId: string): Promise<string | null> {
    const socketId = await this.redis.get(RedisKeys.userToSocket(userId));
    if (!socketId) return null;

    // Search through all active rooms to find the user
    const activeRooms = await this.redis.smembers(RedisKeys.activeRooms);
    for (const roomId of activeRooms) {
      const participantData = await this.redis.hget(
        RedisKeys.roomParticipants(roomId),
        userId,
      );
      if (participantData) {
        return roomId;
      }
    }
    return null;
  }

  /**
   * Gets the participant entry for a specific user in a room.
   */
  async getParticipant(roomId: string, userId: string): Promise<RoomParticipant | null> {
    const data = await this.redis.hget(RedisKeys.roomParticipants(roomId), userId);
    return data ? (JSON.parse(data) as RoomParticipant) : null;
  }

  /**
   * Updates the router ID for a room in Redis.
   */
  async setRouterId(roomId: string, routerId: string): Promise<void> {
    await this.redis.hset(RedisKeys.room(roomId), 'routerId', routerId);
  }

  /**
   * Gets room metadata from Redis.
   */
  async getRoomState(roomId: string): Promise<RedisRoomState | null> {
    const data = await this.redis.hgetall(RedisKeys.room(roomId));
    if (!data || !data['roomId']) {
      return null;
    }

    const participants = await this.getParticipantsMap(roomId);

    return {
      roomId: data['roomId'],
      roomCode: data['roomCode'],
      hostUserId: data['hostUserId'],
      status: data['status'],
      createdAt: parseInt(data['createdAt'] || '0', 10),
      maxParticipants: parseInt(data['maxParticipants'] || '100', 10),
      routerId: data['routerId'],
      participants,
      allowScreenShare: data['allowScreenShare'] === 'true',
      allowWhiteboard: data['allowWhiteboard'] === 'true',
    } as RedisRoomState & { allowScreenShare: boolean; allowWhiteboard: boolean };
  }

  /**
   * Updates screen sharing and whiteboard room permissions.
   */
  async updateRoomSettings(params: {
    roomId: string;
    requestingUserId: string;
    settings: {
      allowScreenShare?: boolean;
      allowWhiteboard?: boolean;
    };
  }): Promise<void> {
    const roomState = await this.redis.hgetall(RedisKeys.room(params.roomId));

    if (!roomState || !roomState['roomId']) {
      throw new WsRoomException('Room not found');
    }

    if (roomState['hostUserId'] !== params.requestingUserId) {
      // Allow co-hosts to update settings if supported. Currently simple check:
      throw new WsRoomException('Only the host can modify room settings');
    }

    const updates: Record<string, string> = {};
    const postgresUpdates: Record<string, boolean> = {};

    if (params.settings.allowScreenShare !== undefined) {
      updates['allowScreenShare'] = String(params.settings.allowScreenShare);
      postgresUpdates['allowScreenShare'] = params.settings.allowScreenShare;
    }

    if (params.settings.allowWhiteboard !== undefined) {
      updates['allowWhiteboard'] = String(params.settings.allowWhiteboard);
      postgresUpdates['allowWhiteboard'] = params.settings.allowWhiteboard;
    }

    if (Object.keys(updates).length > 0) {
      await this.redis.hmset(RedisKeys.room(params.roomId), updates);
      await this.meetingRepo.update(params.roomId, postgresUpdates);
    }
  }

  /**
   * Gets userId from socketId via Redis mapping.
   */
  async getUserIdBySocket(socketId: string): Promise<string | null> {
    return this.redis.get(RedisKeys.socketToUser(socketId));
  }

  /**
   * Updates a participant's producer list in Redis.
   */
  async addProducerToParticipant(
    roomId: string,
    userId: string,
    producerId: string,
  ): Promise<void> {
    const data = await this.redis.hget(RedisKeys.roomParticipants(roomId), userId);
    if (!data) return;

    const participant: RoomParticipant = JSON.parse(data);
    participant.producerIds.push(producerId);

    await this.redis.hset(
      RedisKeys.roomParticipants(roomId),
      userId,
      JSON.stringify(participant),
    );
  }

  /**
   * Removes a producer from a participant's list in Redis.
   */
  async removeProducerFromParticipant(
    roomId: string,
    userId: string,
    producerId: string,
  ): Promise<void> {
    const data = await this.redis.hget(RedisKeys.roomParticipants(roomId), userId);
    if (!data) return;

    const participant: RoomParticipant = JSON.parse(data);
    participant.producerIds = participant.producerIds.filter((id) => id !== producerId);

    await this.redis.hset(
      RedisKeys.roomParticipants(roomId),
      userId,
      JSON.stringify(participant),
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────

  private async getParticipantsMap(roomId: string): Promise<Record<string, RoomParticipant>> {
    const raw = await this.redis.hgetall(RedisKeys.roomParticipants(roomId));
    const result: Record<string, RoomParticipant> = {};
    for (const [userId, data] of Object.entries(raw)) {
      result[userId] = JSON.parse(data) as RoomParticipant;
    }
    return result;
  }

  private async assertHost(roomId: string, userId: string): Promise<void> {
    const roomData = await this.redis.hgetall(RedisKeys.room(roomId));
    if (roomData['hostUserId'] !== userId) {
      throw new WsRoomException('Only the host can perform this action');
    }
  }

  private async assertHostOrCoHost(roomId: string, userId: string): Promise<void> {
    const roomData = await this.redis.hgetall(RedisKeys.room(roomId));
    if (roomData['hostUserId'] === userId) return;

    const participantData = await this.redis.hget(
      RedisKeys.roomParticipants(roomId),
      userId,
    );
    if (!participantData) {
      throw new WsRoomException('Not a participant in this room');
    }

    const participant: RoomParticipant = JSON.parse(participantData);
    if (participant.role !== RoomRole.CO_HOST) {
      throw new WsRoomException('Only hosts or co-hosts can perform this action');
    }
  }

  async getMeetingHistory(filters: {
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
    hostUserId?: string;
  }): Promise<{ meetings: MeetingEntity[]; total: number }> {
    const query = this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.host', 'host')
      .where('meeting.status = :status', { status: RoomStatus.CLOSED })
      .orderBy('meeting.endedAt', 'DESC');

    if (filters.hostUserId) {
      query.andWhere('meeting.hostId = :hostUserId', { hostUserId: filters.hostUserId });
    }

    if (filters.startDate) {
      query.andWhere('meeting.endedAt >= :startDate', { startDate: filters.startDate });
    }
    if (filters.endDate) {
      query.andWhere('meeting.endedAt <= :endDate', { endDate: filters.endDate });
    }

    const total = await query.getCount();
    const meetings = await query
      .skip(filters.offset || 0)
      .take(filters.limit || 50)
      .getMany();

    return { meetings, total };
  }

  async getMeetingSchedule(filters: {
    startDate?: Date;
    endDate?: Date;
    hostUserId?: string;
  }): Promise<MeetingEntity[]> {
    const query = this.meetingRepo.createQueryBuilder('meeting')
      .leftJoinAndSelect('meeting.host', 'host')
      .where('meeting.status = :status', { status: RoomStatus.SCHEDULED })
      .orderBy('meeting.scheduledStart', 'ASC');

    if (filters.hostUserId) {
      query.andWhere('meeting.hostId = :hostUserId', { hostUserId: filters.hostUserId });
    }

    if (filters.startDate) {
      query.andWhere('meeting.scheduledStart >= :startDate', { startDate: filters.startDate });
    } else {
      query.andWhere('meeting.scheduledStart >= :now', { now: new Date() });
    }

    if (filters.endDate) {
      query.andWhere('meeting.scheduledStart <= :endDate', { endDate: filters.endDate });
    }

    return query.getMany();
  }

  async scheduleMeeting(params: {
    hostUserId: string;
    title: string;
    scheduledStart: Date;
    scheduledEnd: Date;
    maxParticipants?: number;
    allowScreenShare?: boolean;
    allowWhiteboard?: boolean;
  }): Promise<MeetingEntity> {
    const roomCode = this.generateRoomCode();
    const max = Math.min(params.maxParticipants ?? this.maxParticipants, 500);

    const meeting = this.meetingRepo.create({
      title: params.title,
      roomCode,
      hostId: params.hostUserId,
      status: RoomStatus.SCHEDULED,
      maxParticipants: max,
      scheduledStart: params.scheduledStart,
      scheduledEnd: params.scheduledEnd,
      allowScreenShare: params.allowScreenShare ?? true,
      allowWhiteboard: params.allowWhiteboard ?? true,
    });

    return this.meetingRepo.save(meeting);
  }

  /**
   * Starts a scheduled meeting by initializing it in Redis so participants can join.
   */
  async startScheduledMeeting(meetingId: string, hostUserId: string): Promise<{ roomId: string; roomCode: string }> {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
    if (!meeting) {
      throw new WsRoomException('Meeting not found');
    }

    if (meeting.status !== RoomStatus.SCHEDULED) {
      throw new WsRoomException(`Meeting cannot be started — current status is "${meeting.status}"`);
    }

    if (meeting.hostId !== hostUserId) {
      throw new WsRoomException('Only the host can start this meeting');
    }

    // Initialize Redis state (same pattern as createRoom)
    const roomState: Record<string, string> = {
      roomId: meeting.id,
      roomCode: meeting.roomCode,
      hostUserId: meeting.hostId,
      status: RoomStatus.WAITING,
      createdAt: String(Date.now()),
      maxParticipants: String(meeting.maxParticipants),
      routerId: '',
      allowScreenShare: String(meeting.allowScreenShare),
      allowWhiteboard: String(meeting.allowWhiteboard),
    };

    const pipeline = this.redis.pipeline();
    pipeline.hmset(RedisKeys.room(meeting.id), roomState);
    pipeline.expire(RedisKeys.room(meeting.id), RedisKeys.ROOM_TTL);
    pipeline.sadd(RedisKeys.activeRooms, meeting.id);
    pipeline.set(RedisKeys.roomCodeToId(meeting.roomCode), meeting.id, 'EX', RedisKeys.ROOM_TTL);
    await pipeline.exec();

    // Update status in PostgreSQL
    await this.meetingRepo.update(meeting.id, {
      status: RoomStatus.WAITING,
      startedAt: new Date(),
    });

    await this.audit.log({
      action: AuditAction.ROOM_CREATED,
      userId: hostUserId,
      roomId: meeting.id,
      metadata: { title: meeting.title, roomCode: meeting.roomCode, scheduledStart: true },
    });

    this.logger.log(`Scheduled meeting started: ${meeting.id} (code: ${meeting.roomCode})`);
    return { roomId: meeting.id, roomCode: meeting.roomCode };
  }

  private generateRoomCode(): string {
    const min = 100000000;
    const max = 999999999;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    const str = code.toString();
    return `${str.slice(0, 3)}-${str.slice(3, 6)}-${str.slice(6)}`;
  }
}
