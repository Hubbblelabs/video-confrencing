/**
 * Prisma Query Examples - Production Patterns
 * 
 * These are real-world queries you'll use in NestJS services.
 * All examples include error handling, transactions, and performance considerations.
 */

import { PrismaClient, RoomStatus, ParticipantRole, AuditAction, RecordingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// USER OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new user with local auth (username/password)
 */
async function createLocalUser(username: string, email: string, passwordHash: string, displayName: string) {
  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
      displayName,
      isActive: true,
      isVerified: false,
      authProviders: {
        create: {
          providerType: 'LOCAL',
          providerId: username, // For local auth, providerId = username
        },
      },
    },
    include: {
      authProviders: true,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_REGISTERED,
      userId: user.id,
      metadata: { username, email },
    },
  });

  return user;
}

/**
 * Link OAuth provider to existing user
 */
async function linkOAuthProvider(
  userId: string,
  providerType: 'GOOGLE' | 'GITHUB' | 'MICROSOFT',
  providerId: string,
  providerEmail: string,
  accessToken?: string,
  refreshToken?: string,
) {
  const authProvider = await prisma.authProvider.create({
    data: {
      userId,
      providerType,
      providerId,
      providerEmail,
      accessToken,
      refreshToken,
      lastUsedAt: new Date(),
    },
  });

  return authProvider;
}

/**
 * Find user by username or email (login)
 */
async function findUserByCredentials(usernameOrEmail: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: usernameOrEmail },
        { email: usernameOrEmail },
      ],
      deletedAt: null, // Soft delete filter
      isActive: true,
    },
    include: {
      authProviders: true,
    },
  });

  return user;
}

/**
 * Soft delete user (GDPR right to be forgotten)
 */
async function softDeleteUser(userId: string) {
  // Use transaction to ensure consistency
  return await prisma.$transaction(async (tx) => {
    // 1. Soft delete user
    const user = await tx.user.update({
      where: { id: userId },
      data: { 
        deletedAt: new Date(),
        isActive: false,
        // Anonymize PII
        email: null,
        displayName: 'Deleted User',
      },
    });

    // 2. Close all active rooms owned by user
    await tx.room.updateMany({
      where: { 
        ownerId: userId,
        status: RoomStatus.LIVE,
      },
      data: { 
        status: RoomStatus.ENDED,
        endedAt: new Date(),
      },
    });

    // 3. End all active participations
    await tx.roomParticipant.updateMany({
      where: { 
        userId,
        leftAt: null,
      },
      data: { leftAt: new Date() },
    });

    // 4. Soft delete all recordings
    await tx.recording.updateMany({
      where: { ownerId: userId },
      data: { deletedAt: new Date() },
    });

    // 5. Audit log (do NOT delete audit logs)
    await tx.auditLog.create({
      data: {
        action: AuditAction.USER_LOGOUT,
        userId,
        metadata: { reason: 'account_deleted' },
      },
    });

    return user;
  });
}

// ═══════════════════════════════════════════════════════════════
// ROOM OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new room (instant meeting)
 */
async function createRoom(
  ownerId: string,
  title: string,
  maxParticipants: number = 100,
  isPublic: boolean = false,
) {
  // Generate unique 8-character room code
  const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const room = await prisma.room.create({
    data: {
      ownerId,
      roomCode,
      title,
      maxParticipants,
      isPublic,
      status: RoomStatus.CREATED,
    },
    include: {
      owner: { select: { id: true, username: true, displayName: true } },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: AuditAction.ROOM_CREATED,
      userId: ownerId,
      roomId: room.id,
      metadata: { roomCode, title, maxParticipants },
    },
  });

  return room;
}

/**
 * Schedule a room (future meeting)
 */
async function scheduleRoom(
  ownerId: string,
  title: string,
  description: string,
  scheduledStart: Date,
  scheduledEnd: Date,
  maxParticipants: number = 100,
) {
  const roomCode = Math.random().toString(36).substring(2, 10).toUpperCase();

  const room = await prisma.room.create({
    data: {
      ownerId,
      roomCode,
      title,
      description,
      scheduledStart,
      scheduledEnd,
      maxParticipants,
      status: RoomStatus.CREATED,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.ROOM_CREATED,
      userId: ownerId,
      roomId: room.id,
      metadata: { roomCode, title, scheduledStart, scheduledEnd },
    },
  });

  return room;
}

/**
 * Start a room (first participant joins)
 */
async function startRoom(roomId: string) {
  const room = await prisma.room.update({
    where: { id: roomId },
    data: {
      status: RoomStatus.LIVE,
      startedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.ROOM_STARTED,
      roomId,
      userId: room.ownerId,
    },
  });

  return room;
}

/**
 * End a room (host closes or last participant leaves)
 */
async function endRoom(roomId: string, endedBy: string) {
  return await prisma.$transaction(async (tx) => {
    const now = new Date();

    // 1. Update room status
    const room = await tx.room.update({
      where: { id: roomId },
      data: {
        status: RoomStatus.ENDED,
        endedAt: now,
      },
    });

    // Calculate duration
    if (room.startedAt) {
      const durationSeconds = Math.floor((now.getTime() - room.startedAt.getTime()) / 1000);
      await tx.room.update({
        where: { id: roomId },
        data: { durationSeconds },
      });
    }

    // 2. End all active participations
    const activeParticipants = await tx.roomParticipant.updateMany({
      where: { 
        roomId,
        leftAt: null,
      },
      data: { leftAt: now },
    });

    // 3. Stop all active recordings
    await tx.recording.updateMany({
      where: { 
        roomId,
        status: { in: [RecordingStatus.STARTED, RecordingStatus.IN_PROGRESS] },
      },
      data: {
        status: RecordingStatus.STOPPED,
        stoppedAt: now,
      },
    });

    // 4. Audit log
    await tx.auditLog.create({
      data: {
        action: AuditAction.ROOM_ENDED,
        userId: endedBy,
        roomId,
        metadata: { 
          participantsEvicted: activeParticipants.count,
          duration: room.durationSeconds ?? 0,
        },
      },
    });

    return room;
  });
}

/**
 * Get active rooms for a user (rooms they're currently in)
 */
async function getUserActiveRooms(userId: string) {
  const participations = await prisma.roomParticipant.findMany({
    where: {
      userId,
      leftAt: null, // Currently in room
    },
    include: {
      room: {
        select: {
          id: true,
          roomCode: true,
          title: true,
          status: true,
          startedAt: true,
          owner: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  return participations.map(p => ({
    ...p.room,
    role: p.role,
    joinedAt: p.joinedAt,
  }));
}

/**
 * Get room by code (for joining)
 */
async function getRoomByCode(roomCode: string) {
  const room = await prisma.room.findUnique({
    where: { 
      roomCode,
      deletedAt: null,
    },
    include: {
      owner: { select: { id: true, username: true, displayName: true } },
      participants: {
        where: { leftAt: null }, // Only active participants
        include: {
          user: { select: { id: true, username: true, displayName: true } },
        },
      },
      _count: {
        select: { participants: true },
      },
    },
  });

  return room;
}

// ═══════════════════════════════════════════════════════════════
// PARTICIPANT OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Join a room
 */
async function joinRoom(userId: string, roomId: string, role: ParticipantRole = ParticipantRole.PARTICIPANT) {
  // Check if user is banned
  const banned = await prisma.roomParticipant.findFirst({
    where: {
      userId,
      roomId,
      isBanned: true,
    },
  });

  if (banned) {
    throw new Error(`User is banned from this room: ${banned.banReason ?? 'No reason provided'}`);
  }

  // Check if room is full
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      _count: {
        select: { 
          participants: { 
            where: { leftAt: null } // Only count active participants
          } 
        },
      },
    },
  });

  if (!room) throw new Error('Room not found');
  if (room._count.participants >= room.maxParticipants) {
    throw new Error('Room is full');
  }

  // Create participation record
  const participation = await prisma.roomParticipant.create({
    data: {
      userId,
      roomId,
      role,
      joinedAt: new Date(),
    },
    include: {
      user: { select: { id: true, username: true, displayName: true } },
      room: { select: { id: true, roomCode: true, title: true, status: true } },
    },
  });

  // If this is the first participant, start the room
  if (room._count.participants === 0 && room.status === RoomStatus.CREATED) {
    await startRoom(roomId);
  }

  // Update totalJoins counter
  await prisma.room.update({
    where: { id: roomId },
    data: { totalJoins: { increment: 1 } },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_JOINED,
      userId,
      roomId,
      metadata: { role },
    },
  });

  return participation;
}

/**
 * Leave a room (graceful exit)
 */
async function leaveRoom(userId: string, roomId: string) {
  const now = new Date();

  // Find active participation
  const participation = await prisma.roomParticipant.findFirst({
    where: {
      userId,
      roomId,
      leftAt: null,
    },
  });

  if (!participation) {
    throw new Error('User is not in this room');
  }

  // Update participation record
  const durationSeconds = Math.floor((now.getTime() - participation.joinedAt.getTime()) / 1000);
  
  const updated = await prisma.roomParticipant.update({
    where: { id: participation.id },
    data: {
      leftAt: now,
      durationSeconds,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_LEFT,
      userId,
      roomId,
      metadata: { durationSeconds },
    },
  });

  // Check if room is now empty (close if host left)
  const remaining = await prisma.roomParticipant.count({
    where: { roomId, leftAt: null },
  });

  if (remaining === 0) {
    await endRoom(roomId, userId);
  }

  return updated;
}

/**
 * Kick a user from a room
 */
async function kickUser(
  roomId: string,
  targetUserId: string,
  kickedBy: string,
  reason?: string,
) {
  // Find active participation
  const participation = await prisma.roomParticipant.findFirst({
    where: {
      userId: targetUserId,
      roomId,
      leftAt: null,
    },
  });

  if (!participation) {
    throw new Error('User is not in this room');
  }

  // Cannot kick the host
  if (participation.role === ParticipantRole.HOST) {
    throw new Error('Cannot kick the host');
  }

  const now = new Date();
  const durationSeconds = Math.floor((now.getTime() - participation.joinedAt.getTime()) / 1000);

  // Update participation record
  const kicked = await prisma.roomParticipant.update({
    where: { id: participation.id },
    data: {
      leftAt: now,
      isKicked: true,
      kickedAt: now,
      kickedBy,
      kickReason: reason,
      durationSeconds,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_KICKED,
      userId: kickedBy,
      roomId,
      targetUserId,
      metadata: { reason, durationSeconds },
    },
  });

  return kicked;
}

/**
 * Ban a user from a room (permanent kick)
 */
async function banUser(
  roomId: string,
  targetUserId: string,
  bannedBy: string,
  reason: string,
) {
  // First, kick if currently in room
  const active = await prisma.roomParticipant.findFirst({
    where: { userId: targetUserId, roomId, leftAt: null },
  });

  if (active) {
    await kickUser(roomId, targetUserId, bannedBy, reason);
  }

  // Create ban record (or update existing participation)
  const banned = await prisma.roomParticipant.create({
    data: {
      userId: targetUserId,
      roomId,
      role: ParticipantRole.PARTICIPANT,
      isBanned: true,
      bannedAt: new Date(),
      bannedBy,
      banReason: reason,
      leftAt: new Date(), // Already left (kicked)
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.USER_BANNED,
      userId: bannedBy,
      roomId,
      targetUserId,
      metadata: { reason },
    },
  });

  return banned;
}

/**
 * Get active participants in a room
 */
async function getActiveParticipants(roomId: string) {
  const participants = await prisma.roomParticipant.findMany({
    where: {
      roomId,
      leftAt: null, // Currently in room
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc', // Who joined first
    },
  });

  return participants;
}

/**
 * Change participant role (promote to co-host, demote, etc.)
 */
async function changeParticipantRole(
  roomId: string,
  targetUserId: string,
  newRole: ParticipantRole,
  changedBy: string,
) {
  const participation = await prisma.roomParticipant.findFirst({
    where: {
      userId: targetUserId,
      roomId,
      leftAt: null,
    },
  });

  if (!participation) {
    throw new Error('User is not in this room');
  }

  const updated = await prisma.roomParticipant.update({
    where: { id: participation.id },
    data: { role: newRole },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.ROLE_CHANGED,
      userId: changedBy,
      roomId,
      targetUserId,
      metadata: { 
        oldRole: participation.role,
        newRole,
      },
    },
  });

  return updated;
}

// ═══════════════════════════════════════════════════════════════
// RECORDING OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Start a recording
 */
async function startRecording(
  roomId: string,
  ownerId: string,
  storageKey: string,
  storageBucket: string,
  filename: string,
) {
  const recording = await prisma.recording.create({
    data: {
      roomId,
      ownerId,
      storageKey,
      storageBucket,
      filename,
      status: RecordingStatus.STARTED,
      startedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.RECORDING_STARTED,
      userId: ownerId,
      roomId,
      metadata: { recordingId: recording.id, storageKey },
    },
  });

  return recording;
}

/**
 * Stop a recording and update metadata
 */
async function stopRecording(
  recordingId: string,
  sizeBytes: bigint,
  durationSeconds: number,
  codec?: string,
  resolution?: string,
) {
  const recording = await prisma.recording.update({
    where: { id: recordingId },
    data: {
      status: RecordingStatus.STOPPED,
      stoppedAt: new Date(),
      sizeBytes,
      durationSeconds,
      codec,
      resolution,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: AuditAction.RECORDING_STOPPED,
      userId: recording.ownerId,
      roomId: recording.roomId,
      metadata: { 
        recordingId,
        sizeBytes: sizeBytes.toString(),
        durationSeconds,
      },
    },
  });

  return recording;
}

/**
 * Get all recordings for a room
 */
async function getRoomRecordings(roomId: string) {
  const recordings = await prisma.recording.findMany({
    where: {
      roomId,
      deletedAt: null,
    },
    include: {
      owner: {
        select: { id: true, username: true, displayName: true },
      },
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  return recordings;
}

/**
 * Cleanup expired recordings (cron job)
 */
async function cleanupExpiredRecordings() {
  const expired = await prisma.recording.findMany({
    where: {
      expiresAt: { lt: new Date() },
      deletedAt: null,
    },
    select: { id: true, storageKey: true, storageBucket: true },
  });

  // Soft delete in database
  await prisma.recording.updateMany({
    where: {
      id: { in: expired.map(r => r.id) },
    },
    data: {
      deletedAt: new Date(),
    },
  });

  // TODO: Delete actual files from S3/GCS in background job

  return expired;
}

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get audit trail for a room
 */
async function getRoomAuditTrail(roomId: string, limit: number = 100, cursor?: string) {
  const logs = await prisma.auditLog.findMany({
    where: {
      roomId,
      ...(cursor && { timestamp: { lt: new Date(cursor) } }),
    },
    include: {
      user: {
        select: { id: true, username: true, displayName: true },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });

  return logs;
}

/**
 * Get audit trail for a user
 */
async function getUserAuditTrail(userId: string, limit: number = 100) {
  const logs = await prisma.auditLog.findMany({
    where: {
      userId,
    },
    include: {
      room: {
        select: { id: true, roomCode: true, title: true },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
    take: limit,
  });

  return logs;
}

/**
 * Search audit logs by action type (security monitoring)
 */
async function searchAuditLogsByAction(
  action: AuditAction,
  startDate: Date,
  endDate: Date,
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      action,
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: {
        select: { id: true, username: true },
      },
      room: {
        select: { id: true, roomCode: true },
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  return logs;
}

// ═══════════════════════════════════════════════════════════════
// ADVANCED ANALYTICS QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get room statistics
 */
async function getRoomStatistics(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      _count: {
        select: {
          participants: true,
          recordings: true,
        },
      },
    },
  });

  if (!room) return null;

  // Get unique participants (deduplicate rejoins)
  const uniqueParticipants = await prisma.roomParticipant.findMany({
    where: { roomId },
    distinct: ['userId'],
    select: { userId: true },
  });

  // Get total duration (sum of all participations)
  const totalDuration = await prisma.roomParticipant.aggregate({
    where: { roomId, durationSeconds: { not: null } },
    _sum: { durationSeconds: true },
  });

  return {
    ...room,
    uniqueParticipantCount: uniqueParticipants.length,
    totalParticipationSeconds: totalDuration._sum.durationSeconds ?? 0,
  };
}

/**
 * Get user statistics
 */
async function getUserStatistics(userId: string) {
  const roomsHosted = await prisma.room.count({
    where: { ownerId: userId, deletedAt: null },
  });

  const roomsJoined = await prisma.roomParticipant.count({
    where: { userId },
  });

  const totalDuration = await prisma.roomParticipant.aggregate({
    where: { userId, durationSeconds: { not: null } },
    _sum: { durationSeconds: true },
  });

  return {
    roomsHosted,
    roomsJoined,
    totalParticipationSeconds: totalDuration._sum.durationSeconds ?? 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// EXPORT ALL FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export {
  // User operations
  createLocalUser,
  linkOAuthProvider,
  findUserByCredentials,
  softDeleteUser,
  
  // Room operations
  createRoom,
  scheduleRoom,
  startRoom,
  endRoom,
  getUserActiveRooms,
  getRoomByCode,
  
  // Participant operations
  joinRoom,
  leaveRoom,
  kickUser,
  banUser,
  getActiveParticipants,
  changeParticipantRole,
  
  // Recording operations
  startRecording,
  stopRecording,
  getRoomRecordings,
  cleanupExpiredRecordings,
  
  // Audit log operations
  getRoomAuditTrail,
  getUserAuditTrail,
  searchAuditLogsByAction,
  
  // Analytics
  getRoomStatistics,
  getUserStatistics,
};
