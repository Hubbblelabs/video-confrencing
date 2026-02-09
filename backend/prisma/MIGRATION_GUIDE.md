# Prisma Migration Guide - TypeORM to Prisma

## Overview

This guide walks through migrating the video conferencing backend from **TypeORM to Prisma** with **zero downtime** and **no data loss**.

---

## Prerequisites

- PostgreSQL 14+ running
- Node.js 18+ installed
- Backend running on NestJS with TypeORM (current state)
- Access to production database (read-only initially)

---

## Phase 1: Install Prisma (Development Environment)

### Step 1.1: Install Dependencies

```bash
cd backend
npm install prisma @prisma/client
npm install -D prisma
```

**Expected package.json additions**:
```json
{
  "dependencies": {
    "@prisma/client": "^6.1.0",
    "prisma": "^6.1.0"
  }
}
```

### Step 1.2: Initialize Prisma

```bash
npx prisma init
```

This creates:
- `prisma/schema.prisma` (schema definition)
- `.env` file with `DATABASE_URL` (if it doesn't exist)

### Step 1.3: Copy Schema

Replace the contents of `prisma/schema.prisma` with the production schema from this repository.

### Step 1.4: Update `.env`

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://user:password@localhost:5432/video_conference?schema=public"

# Connection pooling (optional, recommended for production)
# Use pgBouncer or connection pooler URL
DATABASE_URL_POOLED="postgresql://user:password@localhost:6432/video_conference?schema=public"
```

---

## Phase 2: Create Initial Migration

### Step 2.1: Introspect Existing Database (Optional)

If you're migrating from an existing TypeORM database, introspect first to see the current state:

```bash
npx prisma db pull
```

This generates a `schema.prisma` based on your existing database. Compare it with the new schema to identify changes.

### Step 2.2: Create Baseline Migration

**Option A: Fresh database (no existing data)**

```bash
npx prisma migrate dev --name init
```

This creates the initial migration in `prisma/migrations/`.

**Option B: Existing database with TypeORM data**

1. **Rename existing TypeORM tables** (to avoid conflicts):
```sql
-- Rename existing tables (backup strategy)
ALTER TABLE users RENAME TO users_old;
ALTER TABLE meetings RENAME TO rooms_old; -- Note: meetings → rooms
ALTER TABLE audit_logs RENAME TO audit_logs_old;
```

2. **Create new Prisma schema**:
```bash
npx prisma migrate deploy
```

3. **Data migration script** (see Phase 3).

### Step 2.3: Generate Prisma Client

```bash
npx prisma generate
```

This generates TypeScript types in `node_modules/.prisma/client/`.

**Verify generation**:
```bash
ls node_modules/.prisma/client/
# Should show: index.d.ts, index.js, schema.prisma
```

---

## Phase 3: Data Migration (TypeORM → Prisma Schema)

### Step 3.1: Create Migration Script

Create `prisma/data-migration.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import { DataSource } from 'typeorm';

const prisma = new PrismaClient();

// Old TypeORM connection
const typeormDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user',
  password: 'password',
  database: 'video_conference',
  entities: [], // No need to load entities for raw queries
});

async function migrateUsers() {
  await typeormDataSource.initialize();
  
  // Fetch all users from old schema
  const oldUsers = await typeormDataSource.query(`
    SELECT id, email, password_hash, display_name, is_active, created_at, updated_at
    FROM users_old
  `);

  console.log(`Migrating ${oldUsers.length} users...`);

  for (const oldUser of oldUsers) {
    await prisma.user.create({
      data: {
        id: oldUser.id,
        username: oldUser.email.split('@')[0], // Derive username from email
        email: oldUser.email,
        passwordHash: oldUser.password_hash,
        displayName: oldUser.display_name,
        isActive: oldUser.is_active,
        isVerified: true, // Assume existing users are verified
        createdAt: oldUser.created_at,
        updatedAt: oldUser.updated_at,
        // Create local auth provider
        authProviders: {
          create: {
            providerType: 'LOCAL',
            providerId: oldUser.email,
            lastUsedAt: oldUser.updated_at,
          },
        },
      },
    });
  }

  console.log('✅ Users migrated');
}

async function migrateRooms() {
  // Fetch old meetings (renamed to rooms)
  const oldMeetings = await typeormDataSource.query(`
    SELECT id, title, room_code, host_id, status, max_participants,
           started_at, ended_at, peak_participants, created_at, updated_at
    FROM rooms_old
  `);

  console.log(`Migrating ${oldMeetings.length} rooms...`);

  for (const oldMeeting of oldMeetings) {
    // Map old status to new enum
    let newStatus = 'CREATED';
    if (oldMeeting.status === 'active') newStatus = 'LIVE';
    if (oldMeeting.status === 'closed') newStatus = 'ENDED';
    if (oldMeeting.status === 'waiting') newStatus = 'CREATED';

    // Calculate duration
    let durationSeconds = null;
    if (oldMeeting.started_at && oldMeeting.ended_at) {
      durationSeconds = Math.floor(
        (new Date(oldMeeting.ended_at).getTime() - new Date(oldMeeting.started_at).getTime()) / 1000
      );
    }

    await prisma.room.create({
      data: {
        id: oldMeeting.id,
        ownerId: oldMeeting.host_id,
        roomCode: oldMeeting.room_code,
        title: oldMeeting.title,
        maxParticipants: oldMeeting.max_participants,
        status: newStatus as any,
        startedAt: oldMeeting.started_at,
        endedAt: oldMeeting.ended_at,
        peakParticipants: oldMeeting.peak_participants,
        durationSeconds,
        totalJoins: 0, // New field, default to 0
        createdAt: oldMeeting.created_at,
        updatedAt: oldMeeting.updated_at,
      },
    });
  }

  console.log('✅ Rooms migrated');
}

async function migrateAuditLogs() {
  const oldLogs = await typeormDataSource.query(`
    SELECT id, action, user_id, room_id, metadata, ip_address, created_at
    FROM audit_logs_old
  `);

  console.log(`Migrating ${oldLogs.length} audit logs...`);

  for (const oldLog of oldLogs) {
    await prisma.auditLog.create({
      data: {
        id: oldLog.id,
        action: oldLog.action,
        userId: oldLog.user_id,
        roomId: oldLog.room_id,
        metadata: oldLog.metadata,
        ipAddress: oldLog.ip_address,
        timestamp: oldLog.created_at,
      },
    });
  }

  console.log('✅ Audit logs migrated');
}

async function main() {
  try {
    console.log('🚀 Starting data migration...');
    
    await migrateUsers();
    await migrateRooms();
    await migrateAuditLogs();
    
    console.log('✅ Data migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await typeormDataSource.destroy();
  }
}

main();
```

### Step 3.2: Run Data Migration

```bash
npx ts-node prisma/data-migration.ts
```

**Verification**:
```sql
-- Check row counts match
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM users_old;

SELECT COUNT(*) FROM rooms;
SELECT COUNT(*) FROM rooms_old;

SELECT COUNT(*) FROM audit_logs;
SELECT COUNT(*) FROM audit_logs_old;
```

---

## Phase 4: Update NestJS Code

### Step 4.1: Import PrismaModule in AppModule

**File**: `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module'; // ADD THIS
// ... other imports

@Module({
  imports: [
    PrismaModule, // ADD THIS
    ConfigModule.forRoot({ isGlobal: true }),
    // ... other modules
  ],
  // ...
})
export class AppModule {}
```

### Step 4.2: Replace TypeORM Repositories with PrismaService

**Example**: `src/auth/auth.service.ts`

**Before (TypeORM)**:
```typescript
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async findUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({ where: { email } });
  }
}
```

**After (Prisma)**:
```typescript
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { authProviders: true },
    });
  }
}
```

### Step 4.3: Update All Services

Replace TypeORM patterns with Prisma equivalents:

| TypeORM | Prisma |
|---------|--------|
| `repository.findOne({ where: { id } })` | `prisma.user.findUnique({ where: { id } })` |
| `repository.find()` | `prisma.user.findMany()` |
| `repository.create(data)` | `prisma.user.create({ data })` |
| `repository.save(entity)` | `prisma.user.update({ where: { id }, data })` |
| `repository.delete(id)` | `prisma.user.delete({ where: { id } })` (auto converts to soft delete via middleware) |
| `repository.count()` | `prisma.user.count()` |
| `queryBuilder.leftJoin()` | `prisma.user.findMany({ include: { ... } })` |

### Step 4.4: Remove TypeORM Dependencies

**After all services are migrated**:

1. Remove TypeORM imports from all files.
2. Delete `src/database/entities/` directory.
3. Remove TypeORM from `app.module.ts`:

```typescript
// REMOVE THESE
import { TypeOrmModule } from '@nestjs/typeorm';
TypeOrmModule.forRoot({ ... }),
```

4. Uninstall TypeORM (optional, keep during transition):
```bash
npm uninstall typeorm @nestjs/typeorm
```

---

## Phase 5: Testing

### Step 5.1: Unit Tests

Update unit tests to use `PrismaService`:

```typescript
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should find user by email', async () => {
    const mockUser = { id: '1', email: 'test@example.com' };
    jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser as any);

    const result = await authService.findUserByEmail('test@example.com');
    expect(result).toEqual(mockUser);
  });
});
```

### Step 5.2: Integration Tests

Create a test database:

```bash
# Create test database
createdb video_conference_test

# Run migrations
DATABASE_URL="postgresql://user:password@localhost:5432/video_conference_test" npx prisma migrate deploy
```

**Test helper** (`test/helpers/prisma-test.helper.ts`):
```typescript
import { PrismaClient } from '@prisma/client';

export class PrismaTestHelper {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.TEST_DATABASE_URL },
      },
    });
  }

  async cleanDatabase() {
    const tables = ['audit_logs', 'recordings', 'room_participants', 'rooms', 'auth_providers', 'users'];
    for (const table of tables) {
      await this.prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }

  getPrisma() {
    return this.prisma;
  }
}
```

---

## Phase 6: Production Deployment

### Step 6.1: Blue-Green Deployment Strategy

1. **Deploy new code** (with Prisma) to staging environment.
2. **Run smoke tests** on staging.
3. **Deploy to production** using blue-green deployment:
   - Blue (old): TypeORM-based backend
   - Green (new): Prisma-based backend
4. **Route 10% traffic** to green environment.
5. **Monitor metrics** (response times, error rates).
6. **Gradually increase traffic** to green (25%, 50%, 100%).
7. **Decommission blue environment** after 24 hours of stable operation.

### Step 6.2: Database Migration in Production

**Option A: Maintenance window (recommended for first migration)**

```bash
# 1. Announce maintenance window (5-minute downtime)
# 2. Stop all backend instances
# 3. Run migration
npx prisma migrate deploy

# 4. Start new backend instances (with Prisma)
# 5. Verify health checks
curl https://api.example.com/health
```

**Option B: Zero-downtime migration (advanced)**

1. **Run migrations** (additive only, no column drops):
```bash
npx prisma migrate deploy
```

2. **Deploy new code** (Prisma) alongside old code (TypeORM).
3. **Both read from same tables** during transition.
4. **Gradually migrate traffic** to new code.
5. **Remove old code** after verification.

### Step 6.3: Rollback Plan

If issues occur after deployment:

```bash
# 1. Route all traffic back to blue (TypeORM) environment
# 2. Restore database from backup (if schema was modified)
pg_restore -d video_conference backup.dump

# 3. Re-deploy old code
# 4. Investigate issues in staging
```

---

## Phase 7: Post-Migration Optimization

### Step 7.1: Add Indexes (if not auto-created)

```sql
-- Create indexes concurrently (no table locks)
CREATE INDEX CONCURRENTLY idx_users_active_not_deleted 
  ON users(is_active, deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp_desc 
  ON audit_logs(timestamp DESC);

CREATE INDEX CONCURRENTLY idx_room_participants_active 
  ON room_participants(room_id, left_at) WHERE left_at IS NULL;
```

### Step 7.2: Enable Connection Pooling

Use **PgBouncer** or **pgpool** for production:

```env
# .env (production)
DATABASE_URL="postgresql://user:password@pgbouncer:6432/video_conference?pgbouncer=true"
```

**PgBouncer config** (`pgbouncer.ini`):
```ini
[databases]
video_conference = host=postgres port=5432 dbname=video_conference

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
```

### Step 7.3: Monitor Performance

**Key metrics to track**:
- Query latency (p50, p95, p99)
- Connection pool saturation
- Slow query count (> 1 second)
- Transaction rollback rate

**Prisma query logging**:
```typescript
// Enable slow query logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
});

prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn(`Slow query detected: ${e.query} (${e.duration}ms)`);
  }
});
```

---

## Phase 8: Cleanup

### Step 8.1: Remove Old TypeORM Tables

**After 7 days of stable operation**:

```sql
-- Backup first!
pg_dump -t users_old -t rooms_old -t audit_logs_old video_conference > backup_old_tables.sql

-- Drop old tables
DROP TABLE IF EXISTS users_old CASCADE;
DROP TABLE IF EXISTS rooms_old CASCADE;
DROP TABLE IF EXISTS audit_logs_old CASCADE;
```

### Step 8.2: Update Documentation

- Update README with Prisma instructions
- Document new schema in wiki
- Update API docs with new model names (Meeting → Room)

---

## Troubleshooting

### Issue: "Prisma Client could not be generated"

**Solution**:
```bash
rm -rf node_modules/.prisma
npx prisma generate
```

### Issue: "Migration failed: relations do not exist"

**Solution**: Ensure migrations are applied in order:
```bash
npx prisma migrate resolve --applied <migration_name>
npx prisma migrate deploy
```

### Issue: "Connection pool exhausted"

**Solution**: Increase pool size or use PgBouncer:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/video_conference?connection_limit=50"
```

### Issue: "Slow queries after migration"

**Solution**: Run `ANALYZE` on all tables:
```sql
ANALYZE users;
ANALYZE rooms;
ANALYZE room_participants;
ANALYZE audit_logs;
```

---

## Summary Checklist

- [ ] Prisma installed and initialized
- [ ] Schema copied from repository
- [ ] Initial migration created
- [ ] Data migrated from TypeORM (if applicable)
- [ ] All services updated to use PrismaService
- [ ] TypeORM dependencies removed
- [ ] Unit tests updated
- [ ] Integration tests passing
- [ ] Staging deployment successful
- [ ] Production deployment (blue-green)
- [ ] Monitoring dashboards configured
- [ ] Connection pooling enabled (PgBouncer)
- [ ] Indexes created (if not auto-generated)
- [ ] Old TypeORM tables backed up and dropped (after 7 days)
- [ ] Documentation updated

---

## Need Help?

Refer to:
- **Prisma docs**: https://www.prisma.io/docs
- **NestJS + Prisma guide**: https://docs.nestjs.com/recipes/prisma
- **Schema design**: `prisma/SCHEMA_DESIGN.md`
- **Example queries**: `prisma/example-queries.ts`
