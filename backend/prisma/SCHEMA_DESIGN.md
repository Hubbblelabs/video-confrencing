# Prisma Schema Design Documentation

## Overview

This Prisma schema is designed for a **production-grade video conferencing platform** with strict enterprise requirements:

- **Control-plane only**: Database stores persistent state. Real-time ephemeral state (active connections, media producers/consumers) lives in **Redis**.
- **Audit-first**: Immutable security trail for compliance (GDPR, SOC 2, HIPAA-ready).
- **Migration-safe**: Explicit relations, no cascade deletes on critical data, soft deletes everywhere.
- **Extensible**: Future-proof for OAuth providers, SAML SSO, billing, analytics, AI features.

---

## Core Design Principles

### ✅ What We Did Right

1. **Explicit relation tables**: `RoomParticipant` is a full model, not a magic Prisma implicit many-to-many. Why?
   - Need to track join/leave timestamps
   - Need role per participation
   - Need kick/ban metadata
   - Need to support rejoining (multiple participations)

2. **No polymorphic relations**: Each model has clear foreign keys. No `{type, id}` tuples.

3. **Soft deletes everywhere**: `deletedAt` fields preserve audit trail integrity. Users, rooms, recordings can never be hard-deleted.

4. **Separate auth providers**: `AuthProvider` model allows one user to link Google, GitHub, Apple, etc. Future-proof for enterprise SSO.

5. **Recording is metadata only**: Actual video files live in S3/GCS. We store references, not blobs.

6. **Audit logs are immutable**: No `updatedAt`, no deletes. Append-only with `onDelete: SetNull` to preserve logs even if entities are deleted.

### ❌ What We Avoided

- ❌ JSON blobs for core relations (meeting attendees as JSON array)
- ❌ Polymorphic `targetType/targetId` patterns
- ❌ Cascade deletes on critical data (users, rooms)
- ❌ Missing indexes on time-series queries (`timestamp DESC`)
- ❌ Over-normalization (no separate `Address` table for IP addresses)
- ❌ Under-normalization (repeated auth provider config in user metadata)

---

## Model Relationships Explained

### User → AuthProvider (1:N)

**Cardinality**: One user, multiple OAuth providers.

**Why?**: 
- User links Google account today, GitHub tomorrow.
- Enterprise users may have both corporate SSO (SAML) and personal GitHub.
- If we stored provider in User model, switching providers = data loss.

**Deletion**: Cascade. If user is deleted (soft), all auth providers cascade delete (we don't need orphaned OAuth tokens).

### User → Room (1:N via `ownerId`)

**Cardinality**: One user owns many rooms (they can create multiple meetings).

**Why?**: 
- Clear ownership semantics. The owner can:
  - Close the room
  - Delete recordings
  - Change room settings
  - Transfer ownership (future enhancement)

**Deletion**: Restrict. Cannot delete a user who owns active rooms. Must transfer or close rooms first.

### User ↔ Room (M:N via RoomParticipant)

**Cardinality**: Users join multiple rooms. Rooms have multiple participants.

**Why explicit table?**: 
- Track role per room (host, co-host, participant)
- Track join/leave timestamps
- Support kick/ban (cannot rejoin if banned)
- Support multiple participation records (rejoin after leaving)

**Deletion**: Cascade. If room is deleted, participation records cascade (we don't need participant records for non-existent rooms).

### Room → Recording (1:N)

**Cardinality**: One room, multiple recordings (host can stop/restart recording).

**Why?**: 
- Host may record entire meeting
- Host may pause recording during break
- Need separate metadata per recording chunk

**Deletion**: Restrict. Cannot delete room if recordings exist (must delete recordings first, respecting retention policy).

### User|Room → AuditLog (N:1)

**Cardinality**: Many audit events per user/room.

**Why?**: 
- Security trail: who did what, when
- Compliance: GDPR access logs, SOC 2 audit requirements
- Forensics: investigate suspicious activity

**Deletion**: SetNull. If user/room is deleted, audit logs remain but foreign key becomes NULL. Preserves timeline.

---

## Enum Design Rationale

### RoomStatus

```prisma
enum RoomStatus {
  CREATED   // Room object exists, no one joined yet
  LIVE      // At least one participant present
  ENDED     // Meeting concluded normally
  CANCELLED // Scheduled meeting cancelled before starting
}
```

**Why 4 states?**:
- `CREATED` allows scheduled meetings that haven't started.
- `LIVE` is the only state where participants can join.
- `ENDED` vs `CANCELLED` matters for analytics (did it happen?).
- No `ACTIVE` (ambiguous) or `WAITING` (what are we waiting for?).

### ParticipantRole

```prisma
enum ParticipantRole {
  HOST        // Owner permissions
  CO_HOST     // Moderator permissions
  PARTICIPANT // Standard attendee
}
```

**Why 3 roles?**:
- `HOST`: Full control. Can close room, delete recordings, kick anyone.
- `CO_HOST`: Moderation. Can kick participants, mute all (but cannot destroy room).
- `PARTICIPANT`: Basic. Can speak, share screen, use chat.

**Future evolution**: Could add `PRESENTER` (can share screen but not kick) or `OBSERVER` (view-only).

### RecordingStatus

```prisma
enum RecordingStatus {
  STARTED     // Recording initiated
  IN_PROGRESS // Actively writing chunks
  STOPPED     // Gracefully stopped
  FAILED      // Encountered error
  PROCESSING  // Post-processing (transcoding, thumbnails)
  READY       // Available for playback
}
```

**Why 6 states?**:
- Separates recording lifecycle from video processing lifecycle.
- `IN_PROGRESS` → `STOPPED` → `PROCESSING` → `READY` is happy path.
- `FAILED` state allows retry logic without losing metadata.

### AuditAction

31 actions covering:
- **Authentication**: `USER_REGISTERED`, `USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`
- **Room lifecycle**: `ROOM_CREATED`, `ROOM_STARTED`, `ROOM_ENDED`
- **Participant events**: `USER_JOINED`, `USER_LEFT`, `USER_KICKED`, `USER_BANNED`
- **Security**: `UNAUTHORIZED_ACCESS_ATTEMPT`, `RATE_LIMIT_EXCEEDED`, `SUSPICIOUS_ACTIVITY`
- **Media**: `PRODUCER_CREATED`, `PRODUCER_CLOSED`, `SCREEN_SHARE_STARTED`
- **Recording**: `RECORDING_STARTED`, `RECORDING_STOPPED`, `RECORDING_DELETED`

**Why so many?**: Compliance. SOC 2 requires detailed audit trail. Must be able to answer:
- Who accessed what data, when?
- What configuration changes were made?
- Were there any security incidents?

---

## Indexing Strategy

### High-Traffic Queries

#### 1. Get active rooms
```sql
SELECT * FROM rooms WHERE status = 'LIVE' AND deletedAt IS NULL;
```
**Index**: `rooms[status, deletedAt]` (composite)

#### 2. Get user's active rooms
```sql
SELECT r.* FROM rooms r
JOIN room_participants rp ON rp.roomId = r.id
WHERE rp.userId = ? AND rp.leftAt IS NULL;
```
**Index**: `room_participants[userId, leftAt]` (covering)

#### 3. Get room participants
```sql
SELECT * FROM room_participants WHERE roomId = ? AND leftAt IS NULL;
```
**Index**: `room_participants[roomId, leftAt]`

#### 4. Check if user is banned from room
```sql
SELECT * FROM room_participants 
WHERE userId = ? AND roomId = ? AND isBanned = true;
```
**Index**: `room_participants[isBanned, roomId, userId]` (not created, query rare)

#### 5. Audit trail for user
```sql
SELECT * FROM audit_logs WHERE userId = ? ORDER BY timestamp DESC LIMIT 100;
```
**Index**: `audit_logs[userId, timestamp DESC]`

#### 6. Audit trail for room
```sql
SELECT * FROM audit_logs WHERE roomId = ? ORDER BY timestamp DESC;
```
**Index**: `audit_logs[roomId, timestamp DESC]`

#### 7. Cleanup expired recordings
```sql
SELECT * FROM recordings WHERE expiresAt < NOW() AND deletedAt IS NULL;
```
**Index**: `recordings[expiresAt, deletedAt]` (for cron job)

### Why These Indexes?

- **Composite indexes**: Postgres can use them for prefix queries. `[userId, leftAt]` works for `WHERE userId = ?` alone.
- **DESC sort on timestamp**: Time-series queries default to newest-first. Index matches query pattern.
- **Covering indexes**: `room_participants[userId, leftAt]` covers common join query without table lookup.

---

## Soft Delete Strategy

### Who Gets Soft Deleted?

- ✅ **Users**: Preserve audit trail. Cannot delete user who appears in logs.
- ✅ **Rooms**: Preserve meeting history, participant records, recordings.
- ✅ **Recordings**: GDPR right to be forgotten. Mark deleted, purge file from S3 later.
- ❌ **AuthProvider**: Cascade delete (no value in keeping orphaned OAuth tokens).
- ❌ **RoomParticipant**: Cascade delete with room (participation records are room metadata).
- ❌ **AuditLog**: Never delete. Immutable by design.

### Soft Delete Query Pattern

```typescript
// ❌ Bad: Easy to forget filter
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Good: Always filter soft deletes
const user = await prisma.user.findUnique({ 
  where: { id, deletedAt: null } 
});

// ✅ Best: Use Prisma middleware to auto-filter
prisma.$use(async (params, next) => {
  if (params.model === 'User' && params.action === 'findUnique') {
    params.args.where = { ...params.args.where, deletedAt: null };
  }
  return next(params);
});
```

---

## Unique Constraints & Business Rules

### User
- ✅ `username` unique: No duplicate usernames.
- ✅ `email` unique: No duplicate emails (but nullable for OAuth-only users).

### AuthProvider
- ✅ `[providerType, providerId]` unique: One Google account can link to one user only.

### Room
- ✅ `roomCode` unique: Human-readable join codes must be globally unique.

### RoomParticipant
- ✅ `[userId, roomId, joinedAt]` unique: Composite key supports rejoining (new record per join).

### Recording
- ✅ `storageKey` unique: One S3 object maps to one recording record.

---

## Migration Strategy

### Phase 1: Initial Migration (Current TypeORM → Prisma)

**Goal**: Replace TypeORM with Prisma without downtime.

**Steps**:
1. **Install Prisma**:
   ```bash
   npm install prisma @prisma/client
   npm install -D prisma
   ```

2. **Initialize Prisma** (creates `prisma/schema.prisma`):
   ```bash
   npx prisma init
   ```

3. **Copy schema** from this file into `prisma/schema.prisma`.

4. **Create initial migration**:
   ```bash
   npx prisma migrate dev --name init
   ```
   This generates SQL in `prisma/migrations/`.

5. **Review generated SQL**: Ensure indexes, constraints, enums match requirements.

6. **Apply migration to dev database**:
   ```bash
   npx prisma migrate deploy
   ```

7. **Generate Prisma Client**:
   ```bash
   npx prisma generate
   ```

8. **Replace TypeORM imports** with Prisma Client in NestJS services:
   ```typescript
   // Old
   import { InjectRepository } from '@nestjs/typeorm';
   import { Repository } from 'typeorm';
   
   // New
   import { PrismaService } from './prisma.service';
   ```

9. **Run integration tests**: Verify CRUD operations work.

10. **Deploy to staging**: Blue-green deployment with new Prisma code.

### Phase 2: Data Backfill (If Migrating From Existing DB)

If you have existing TypeORM data:

```sql
-- Add new columns with defaults
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE recordings ADD COLUMN storage_bucket VARCHAR(100) DEFAULT 'default-bucket';

-- Backfill missing data
UPDATE rooms SET duration_seconds = EXTRACT(EPOCH FROM (ended_at - started_at))::INT
WHERE ended_at IS NOT NULL AND duration_seconds IS NULL;

UPDATE room_participants SET duration_seconds = EXTRACT(EPOCH FROM (left_at - joined_at))::INT
WHERE left_at IS NOT NULL AND duration_seconds IS NULL;
```

### Phase 3: Add Missing Indexes (Post-Deployment)

```sql
-- Create indexes concurrently to avoid table locks
CREATE INDEX CONCURRENTLY idx_users_active_not_deleted 
  ON users(is_active, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp_desc 
  ON audit_logs(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_recordings_expires_at 
  ON recordings(expires_at) WHERE deleted_at IS NULL;
```

### Phase 4: Partition AuditLog Table (At Scale)

When `audit_logs` exceeds 100M rows, partition by month:

```sql
-- Convert to partitioned table
CREATE TABLE audit_logs_partitioned (LIKE audit_logs INCLUDING ALL);

-- Create monthly partitions
CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Backfill data
INSERT INTO audit_logs_partitioned SELECT * FROM audit_logs;

-- Swap tables (requires downtime or trigger-based replication)
```

---

## Data Integrity Rules

### Enforced by Database

1. **Cannot delete user who owns active rooms** (`onDelete: Restrict` on Room.ownerId).
2. **Cannot delete room with recordings** (`onDelete: Restrict` on Recording.roomId).
3. **Room code must be unique** (unique constraint).
4. **Auth provider can only link to one user** (unique `[providerType, providerId]`).

### Enforced by Application

1. **Only one active participation per user per room** (check `leftAt IS NULL` before creating new).
2. **Host cannot be kicked from own room** (check `role != HOST` before kick).
3. **Banned users cannot rejoin** (check `isBanned = true` before allowing join).
4. **Recording owner must be room participant** (validate at recording start).

---

## Future Evolution Paths

### ✅ Easy to Add

- **Billing**: Add `Subscription`, `Invoice`, `Plan` models with `userId` foreign key.
- **Chat**: Add `Message` model with `roomId` and `userId`.
- **Reactions**: Add `Reaction` model with `messageId` or `participantId`.
- **Polls**: Add `Poll`, `PollOption`, `PollVote` models.
- **Breakout rooms**: Add `parentRoomId` self-referential FK on Room.
- **Webhooks**: Add `Webhook`, `WebhookDelivery` models for event subscriptions.

### ⚠️ Requires Careful Design

- **Multi-tenancy**: Add `Organization` model with `organizationId` foreign key on User, Room.
- **RBAC**: Add `Permission`, `Role`, `RolePermission` models for fine-grained access control.
- **Analytics**: Consider separate read replica or OLAP database (do not query analytics from OLTP).

---

## Performance Considerations

### Query Patterns (100k+ meetings, 10M+ audit logs)

1. **Paginate time-series queries**:
   ```typescript
   const logs = await prisma.auditLog.findMany({
     where: { roomId },
     orderBy: { timestamp: 'desc' },
     take: 100,
     skip: (page - 1) * 100,
   });
   ```

2. **Use cursor-based pagination for infinite scroll**:
   ```typescript
   const logs = await prisma.auditLog.findMany({
     where: { userId, timestamp: { lt: cursor } },
     orderBy: { timestamp: 'desc' },
     take: 50,
   });
   ```

3. **Preload relations selectively**:
   ```typescript
   // ❌ Bad: N+1 queries
   const rooms = await prisma.room.findMany();
   for (const room of rooms) {
     const participants = await prisma.roomParticipant.findMany({ where: { roomId: room.id } });
   }
   
   // ✅ Good: Single query with join
   const rooms = await prisma.room.findMany({
     include: { participants: { where: { leftAt: null } } },
   });
   ```

4. **Aggregate in database, not application**:
   ```typescript
   // ❌ Bad: Fetch all, count in JS
   const logs = await prisma.auditLog.findMany({ where: { userId } });
   const count = logs.length;
   
   // ✅ Good: COUNT in database
   const count = await prisma.auditLog.count({ where: { userId } });
   ```

### Connection Pooling

```typescript
// prisma/prisma.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['query', 'error', 'warn'],
      // Connection pooling
      connectionLimit: 20,
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## Summary

This schema is designed for **enterprise production use** with:

- ✅ Clear ownership semantics
- ✅ Audit trail integrity
- ✅ Soft delete everywhere
- ✅ Efficient indexes for high-traffic queries
- ✅ Future-proof for OAuth, SAML, multi-tenancy
- ✅ Migration-safe (no cascade deletes on critical data)
- ✅ Extensible for billing, chat, analytics, AI

**NOT designed for**:
- ❌ Toy demos
- ❌ Prototypes
- ❌ Hackathons

This schema assumes **millions of meetings**, **SOC 2 compliance**, and **zero tolerance for data loss**.
