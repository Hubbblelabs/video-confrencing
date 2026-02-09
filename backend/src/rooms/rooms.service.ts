import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../redis/redis-keys';
import { AuditService } from '../audit/audit.service';
import { MeetingEntity } from '../database/entities';
import { RoomRole, RoomStatus, AuditAction } from '../shared/enums';
import type { RoomParticipant, RedisRoomState } from '../shared/interfaces';
import { WsRoomException } from '../shared/exceptions';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);
  private readonly maxParticipants: number;

  constructor(
    @InjectRepository(MeetingEntity)
    private readonly meetingRepo: Repository<MeetingEntity>,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
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
    });
    const saved = await this.meetingRepo.save(meeting);

    // Initialize Redis state
    const roomState: Record<string, string> = {
      roomId: saved.id,
      hostUserId: params.hostUserId,
      status: RoomStatus.WAITING,
      createdAt: String(Date.now()),
      maxParticipants: String(max),
      routerId: '',
    };

    const pipeline = this.redis.pipeline();
    pipeline.hmset(RedisKeys.room(saved.id), roomState);
    pipeline.expire(RedisKeys.room(saved.id), RedisKeys.ROOM_TTL);
    pipeline.sadd(RedisKeys.activeRooms, saved.id);
    await pipeline.exec();

    await this.audit.log({
      action: AuditAction.ROOM_CREATED,
      userId: params.hostUserId,
      roomId: saved.id,
      metadata: { title: params.title, roomCode, maxParticipants: max },
    });

    this.logger.log(`Room created: ${saved.id} by user ${params.hostUserId}`);
    return { roomId: saved.id, roomCode };
  }

  /**
   * Adds a participant to a room in Redis. Enforces max participant limit.
   */
  async joinRoom(params: {
    roomId: string;
    userId: string;
    socketId: string;
  }): Promise<{ role: RoomRole; participants: RoomParticipant[] }> {
    const roomData = await this.redis.hgetall(RedisKeys.room(params.roomId));
    if (!roomData || !roomData['roomId']) {
      throw new WsRoomException('Room not found');
    }

    if (roomData['status'] === RoomStatus.CLOSED) {
      throw new WsRoomException('Room is closed');
    }

    const currentCount = await this.redis.hlen(RedisKeys.roomParticipants(params.roomId));
    const maxP = parseInt(roomData['maxParticipants'] || '100', 10);

    if (currentCount >= maxP) {
      throw new WsRoomException('Room is full');
    }

    // Check if user is the host
    const isHost = roomData['hostUserId'] === params.userId;
    const role = isHost ? RoomRole.HOST : RoomRole.PARTICIPANT;

    const participant: RoomParticipant = {
      userId: params.userId,
      socketId: params.socketId,
      role,
      joinedAt: Date.now(),
      producerIds: [],
      isMuted: false,
      isVideoOff: false,
    };

    // Store in Redis with pipeline
    const pipeline = this.redis.pipeline();
    pipeline.hset(
      RedisKeys.roomParticipants(params.roomId),
      params.userId,
      JSON.stringify(participant),
    );
    pipeline.set(RedisKeys.socketToUser(params.socketId), params.userId, 'EX', RedisKeys.SOCKET_TTL);
    pipeline.set(RedisKeys.userToSocket(params.userId), params.socketId, 'EX', RedisKeys.SOCKET_TTL);

    // Activate room on first join
    if (roomData['status'] === RoomStatus.WAITING && isHost) {
      pipeline.hset(RedisKeys.room(params.roomId), 'status', RoomStatus.ACTIVE);
    }
    await pipeline.exec();

    // Update peak participants
    const newCount = currentCount + 1;
    await this.meetingRepo
      .createQueryBuilder()
      .update()
      .set({
        peakParticipants: () => `GREATEST("peakParticipants", ${newCount})`,
        startedAt: () => `COALESCE("startedAt", NOW())`,
      })
      .where('id = :id', { id: params.roomId })
      .execute();

    await this.audit.log({
      action: AuditAction.USER_JOINED,
      userId: params.userId,
      roomId: params.roomId,
      metadata: { role, socketId: params.socketId },
    });

    const participants = await this.getParticipants(params.roomId);
    return { role, participants };
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
      hostUserId: data['hostUserId'],
      status: data['status'],
      createdAt: parseInt(data['createdAt'] || '0', 10),
      maxParticipants: parseInt(data['maxParticipants'] || '100', 10),
      routerId: data['routerId'],
      participants,
    } as RedisRoomState;
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

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const segments: string[] = [];
    for (let s = 0; s < 3; s++) {
      let segment = '';
      for (let i = 0; i < 4; i++) {
        segment += chars[Math.floor(Math.random() * chars.length)];
      }
      segments.push(segment);
    }
    return segments.join('-');
  }
}
