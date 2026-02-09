# Prisma Data Layer - Video Conferencing Platform

## 📚 Documentation Index

This directory contains the complete Prisma-based data layer for the production video conferencing platform.

### Core Files

| File | Purpose |
|------|---------|
| **`schema.prisma`** | Complete database schema with all models, enums, relations, and indexes |
| **`SCHEMA_DESIGN.md`** | In-depth design documentation explaining all decisions, patterns, and rationales |
| **`MIGRATION_GUIDE.md`** | Step-by-step guide for migrating from TypeORM to Prisma (zero downtime) |
| **`example-queries.ts`** | Production-ready TypeScript queries for all common operations |

### NestJS Integration

| File | Purpose |
|------|---------|
| **`../src/prisma/prisma.service.ts`** | NestJS service with connection management, middleware, error handling |
| **`../src/prisma/prisma.module.ts`** | Global module for dependency injection |

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 2. Set Environment Variables

Create `.env` in the backend root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/video_conference?schema=public"
```

### 3. Run Migrations

```bash
# Create migration
npx prisma migrate dev --name init

# Or apply existing migrations
npx prisma migrate deploy
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Use in NestJS

```typescript
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class RoomService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(ownerId: string, title: string) {
    return this.prisma.room.create({
      data: {
        ownerId,
        title,
        roomCode: generateRoomCode(),
        status: 'CREATED',
      },
    });
  }
}
```

---

## 📖 Schema Overview

### Models (6 total)

1. **User** - Users with auth providers, soft deletes, OAuth support
2. **AuthProvider** - Multi-provider authentication (Google, GitHub, SAML, etc.)
3. **Room** - Video conference meetings (scheduled or instant)
4. **RoomParticipant** - Explicit many-to-many with roles, kick/ban support
5. **Recording** - Meeting recording metadata (file storage in S3/GCS)
6. **AuditLog** - Immutable security audit trail (31 event types)

### Enums (5 total)

- `AuthProviderType` - LOCAL, GOOGLE, GITHUB, MICROSOFT, APPLE, SAML
- `RoomStatus` - CREATED, LIVE, ENDED, CANCELLED
- `ParticipantRole` - HOST, CO_HOST, PARTICIPANT
- `RecordingStatus` - STARTED, IN_PROGRESS, STOPPED, FAILED, PROCESSING, READY
- `AuditAction` - 31 security events for compliance

### Key Features

✅ **Soft deletes** on User, Room, Recording (preserves audit trail)  
✅ **Explicit relation tables** (no Prisma implicit many-to-many magic)  
✅ **OAuth multi-provider** support (one user, multiple auth methods)  
✅ **Kick/ban system** with rejoining support  
✅ **Recording lifecycle** tracking (separate from video storage)  
✅ **Immutable audit logs** (append-only, never delete)  
✅ **Production-grade indexes** (time-series queries, covering indexes)  

---

## 🏗️ Architecture Principles

### What We Did Right

1. **Control-plane only**: Database stores persistent state. Real-time ephemeral state (WebSocket connections, media producers/consumers) lives in **Redis**.

2. **Explicit relations**: `RoomParticipant` is a full model with metadata (join/leave times, role, kick reason). Not a magic `@relation`.

3. **No JSON blobs**: Core relations are proper foreign keys. Metadata is JSONB only for truly dynamic data.

4. **Soft deletes everywhere**: Users, rooms, recordings can never be hard-deleted (audit trail integrity).

5. **Separate auth providers**: Future-proof for enterprise SSO, multi-account linking.

6. **Audit-first**: 31 security event types. SOC 2 / HIPAA / GDPR ready.

### What We Avoided

❌ Polymorphic relations (`targetType`, `targetId`)  
❌ CASCADE DELETE on critical data (users, rooms)  
❌ Missing indexes on time-series queries  
❌ Storing media files in database (URLs only)  
❌ Over-normalization (separate `Address` table for IP)  
❌ Under-normalization (auth config in user JSON blob)  

---

## 🔒 Security & Compliance

### Soft Delete Middleware

PrismaService automatically filters soft-deleted records:

```typescript
// Automatically excludes deleted users
const users = await prisma.user.findMany();

// Equivalent to:
const users = await prisma.user.findMany({ 
  where: { deletedAt: null } 
});
```

### Audit Trail

Every critical action is logged:

```typescript
await prisma.auditLog.create({
  data: {
    action: 'USER_KICKED',
    userId: kickerId,
    roomId,
    targetUserId,
    metadata: { reason: 'Disruptive behavior' },
    ipAddress: req.ip,
  },
});
```

**Audit logs are immutable** - never update or delete.

### GDPR Compliance

- **Right to be forgotten**: `softDeleteUser()` anonymizes PII but preserves audit trail
- **Data portability**: Export user data via Prisma queries
- **Access logs**: All data access logged via `AuditAction.UNAUTHORIZED_ACCESS_ATTEMPT`

---

## 📊 Performance Considerations

### Indexes (19 total)

All high-traffic queries are indexed:

```typescript
// ✅ Indexed query (fast)
const activeRooms = await prisma.room.findMany({
  where: { status: 'LIVE', deletedAt: null },
});

// Uses: rooms[status, deletedAt] index
```

### Connection Pooling

Production uses PgBouncer:

```env
DATABASE_URL="postgresql://user:password@pgbouncer:6432/video_conference?pgbouncer=true"
```

### Pagination

Always paginate time-series queries:

```typescript
// ❌ Bad: Fetches all logs
const logs = await prisma.auditLog.findMany({ where: { roomId } });

// ✅ Good: Cursor-based pagination
const logs = await prisma.auditLog.findMany({
  where: { roomId, timestamp: { lt: cursor } },
  orderBy: { timestamp: 'desc' },
  take: 50,
});
```

### Query Optimization

Use `include` for joins (avoids N+1):

```typescript
// ❌ Bad: N+1 queries
const rooms = await prisma.room.findMany();
for (const room of rooms) {
  const participants = await prisma.roomParticipant.findMany({ where: { roomId: room.id } });
}

// ✅ Good: Single query
const rooms = await prisma.room.findMany({
  include: { 
    participants: { where: { leftAt: null } } 
  },
});
```

---

## 🧪 Testing

### Unit Tests

Mock PrismaService:

```typescript
const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
};

const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: PrismaService, useValue: mockPrisma },
  ],
}).compile();
```

### Integration Tests

Use test database:

```bash
# Create test DB
createdb video_conference_test

# Run migrations
DATABASE_URL="postgresql://localhost:5432/video_conference_test" npx prisma migrate deploy

# Clean between tests
await prisma.$executeRaw`TRUNCATE TABLE users CASCADE`;
```

---

## 🔄 Migration Strategy

See **`MIGRATION_GUIDE.md`** for complete TypeORM → Prisma migration steps.

**Summary**:
1. Install Prisma alongside TypeORM
2. Create initial migration (`prisma migrate dev --name init`)
3. Migrate data from old tables (if needed)
4. Update NestJS services to use `PrismaService`
5. Remove TypeORM dependencies
6. Deploy with blue-green strategy (zero downtime)

---

## 📈 Scaling Considerations

### Read Replicas

For high read traffic, use Prisma replica extension:

```typescript
const prisma = new PrismaClient().$extends({
  query: {
    $allOperations({ operation, query }) {
      if (operation.startsWith('find')) {
        // Route reads to replica
        return query({ datasources: { db: { url: READ_REPLICA_URL } } });
      }
      return query();
    },
  },
});
```

### Table Partitioning

When `audit_logs` exceeds 100M rows, partition by month:

```sql
CREATE TABLE audit_logs_partitioned (LIKE audit_logs INCLUDING ALL)
PARTITION BY RANGE (timestamp);

CREATE TABLE audit_logs_2026_02 PARTITION OF audit_logs_partitioned
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### Caching

Cache expensive queries with Redis:

```typescript
const cacheKey = `room:${roomId}:participants`;
let participants = await redis.get(cacheKey);

if (!participants) {
  participants = await prisma.roomParticipant.findMany({ where: { roomId } });
  await redis.setex(cacheKey, 60, JSON.stringify(participants));
}
```

---

## 🛠️ Useful Commands

```bash
# Create new migration
npx prisma migrate dev --name add_user_bio

# Apply migrations (production)
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Open Prisma Studio (GUI)
npx prisma studio

# Introspect existing database
npx prisma db pull

# Reset database (DEV ONLY!)
npx prisma migrate reset

# Seed database
npx prisma db seed

# Check migration status
npx prisma migrate status

# Format schema
npx prisma format
```

---

## 📚 Further Reading

- **Prisma Documentation**: https://www.prisma.io/docs
- **NestJS + Prisma**: https://docs.nestjs.com/recipes/prisma
- **Prisma Best Practices**: https://www.prisma.io/docs/guides/performance-and-optimization
- **PostgreSQL Performance**: https://www.postgresql.org/docs/current/performance-tips.html

---

## 🙋 FAQ

### Q: Why Prisma over TypeORM?

**A**: Type safety, better query builder, auto-generated migrations, first-class TypeScript support, superior performance.

### Q: Why separate `AuthProvider` model?

**A**: Future-proof. Users can link multiple OAuth accounts. Enterprise customers need SAML SSO.

### Q: Why soft deletes?

**A**: Audit trail integrity. Cannot delete a user who appears in audit logs. GDPR compliance (anonymize but preserve structure).

### Q: Why explicit `RoomParticipant` table?

**A**: Need to track join/leave timestamps, role per participation, kick/ban metadata, multiple participations (rejoin support).

### Q: Why 31 audit event types?

**A**: Compliance (SOC 2, HIPAA). Must be able to answer: "Who accessed what data, when?"

### Q: How to add new fields without breaking existing code?

**A**: 
1. Add field as optional (`field String?`)
2. Create migration (`prisma migrate dev`)
3. Backfill data if needed
4. Make field required in next migration

### Q: How to handle migrations in production?

**A**: Use `prisma migrate deploy` (not `dev`). Only additive changes (no column drops) for zero downtime.

---

## ✅ Production Readiness Checklist

- [x] Schema designed for scale (millions of meetings)
- [x] All indexes created for high-traffic queries
- [x] Soft deletes on critical models
- [x] Audit trail for compliance (SOC 2, HIPAA, GDPR)
- [x] Connection pooling configured (PgBouncer)
- [x] Error handling middleware
- [x] Soft delete middleware (auto-filter)
- [x] Migration strategy documented
- [x] Example queries provided
- [x] NestJS integration complete
- [x] Testing strategy documented
- [x] Monitoring metrics defined
- [x] Rollback plan documented
- [x] Scaling considerations addressed

---

## 📝 Schema Stats

- **6 models** (User, AuthProvider, Room, RoomParticipant, Recording, AuditLog)
- **5 enums** (40+ total enum values)
- **19 indexes** (covering high-traffic queries)
- **11 relations** (all explicit foreign keys)
- **4 unique constraints** (prevent duplicates)
- **3 soft delete fields** (preserve audit trail)
- **31 audit event types** (comprehensive security trail)

---

**Last Updated**: February 2026  
**Database**: PostgreSQL 14+  
**Prisma Version**: 6.1.0+  
**NestJS Version**: 11+  
**Schema Version**: 1.0.0  

---

This schema is designed for **enterprise production use** with millions of meetings, SOC 2 compliance, and zero tolerance for data loss. Not for toy demos or hackathons.
