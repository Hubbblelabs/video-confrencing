# Video Conference Backend — Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│   Socket.IO + mediasoup-client + JWT Bearer Token               │
└────────────────────────────┬────────────────────────────────────┘
                             │ WSS / HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NestJS Application                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │  AuthModule   │  │ RoomsModule  │  │    MediaModule      │    │
│  │  JWT verify   │  │  lifecycle   │  │  mediasoup workers  │    │
│  │  register/    │  │  join/leave  │  │  routers/transports │    │
│  │  login        │  │  kick/mute   │  │  producers/consumers│    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                 │
│  ┌──────┴─────────────────┴────────────────────┴───────────┐    │
│  │                   GatewayModule                          │    │
│  │  ConferenceGateway (Socket.IO WebSocket Server)          │    │
│  │  ─ Connection auth (JWT on handshake)                    │    │
│  │  ─ Room scoped events                                    │    │
│  │  ─ WebRTC signaling relay                                │    │
│  │  ─ Rate limiting per socket                              │    │
│  └──────────────────────────────────────────────────────────┘    │
│         │                 │                    │                 │
│  ┌──────┴───────┐  ┌─────┴──────┐  ┌─────────┴────────────┐    │
│  │   AuditModule │  │   Redis    │  │     PostgreSQL        │    │
│  │   (logging)   │  │   (state)  │  │   (persistence)       │    │
│  └──────────────┘  └────────────┘  └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │       mediasoup SFU          │
              │  UDP/TCP 40000–49999         │
              │  RTP/RTCP media streams      │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │     TURN Server (Coturn)     │
              │     NAT traversal relay      │
              └─────────────────────────────┘
```

## NestJS Module Structure

```
src/
├── main.ts                          # Bootstrap, CORS, validation, IO adapter
├── app.module.ts                    # Root module, config loading
├── health.controller.ts             # GET /health
│
├── config/
│   ├── configuration.ts             # registerAs() configs for all services
│   └── index.ts
│
├── shared/
│   ├── enums/
│   │   ├── room-role.enum.ts        # HOST, CO_HOST, PARTICIPANT
│   │   ├── room-status.enum.ts      # WAITING, ACTIVE, CLOSED
│   │   ├── audit-action.enum.ts     # All auditable events
│   │   └── index.ts
│   ├── interfaces/
│   │   └── index.ts                 # JwtPayload, AuthenticatedSocket, RoomParticipant, etc.
│   └── exceptions/
│       ├── ws-exceptions.ts         # WsAuthException, WsRoomException, WsMediaException
│       └── index.ts
│
├── database/
│   ├── database.module.ts           # TypeORM + PostgreSQL connection
│   └── entities/
│       ├── user.entity.ts           # users table
│       ├── meeting.entity.ts        # meetings table
│       ├── audit-log.entity.ts      # audit_logs table
│       └── index.ts
│
├── redis/
│   ├── redis.module.ts              # Global Redis provider
│   ├── redis.service.ts             # ioredis wrapper with typed operations
│   └── redis-keys.ts               # Key patterns + TTL constants
│
├── audit/
│   ├── audit.module.ts              # Global audit logging
│   └── audit.service.ts             # Non-blocking audit writes
│
├── auth/
│   ├── auth.module.ts               # Passport + JWT registration
│   ├── auth.service.ts              # Register, login, token verify
│   ├── auth.controller.ts           # POST /auth/register, /auth/login
│   ├── dto/
│   │   ├── auth.dto.ts              # RegisterDto, LoginDto
│   │   └── index.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts          # Passport JWT strategy
│   └── guards/
│       ├── jwt-auth.guard.ts        # HTTP route guard
│       └── index.ts
│
├── rooms/
│   ├── rooms.module.ts
│   ├── rooms.service.ts             # Room CRUD, participant management, Redis + PG
│   └── dto/
│       ├── room.dto.ts              # CreateRoomDto, JoinRoomDto, KickUserDto, etc.
│       └── index.ts
│
├── media/
│   ├── media.module.ts              # Global mediasoup provider
│   └── media.service.ts             # Worker pool, router, transport, producer, consumer mgmt
│
├── webrtc/
│   ├── webrtc.module.ts
│   └── webrtc.service.ts            # Signaling orchestration layer
│
└── gateway/
    ├── gateway.module.ts
    ├── conference.gateway.ts         # The WebSocket gateway (all events)
    ├── ws-auth.service.ts            # Socket JWT authentication
    ├── ws-exception.filter.ts        # Global WS error handler
    └── ws-events.ts                  # Event name constants
```

## Redis Schema

| Key Pattern | Type | Description | TTL |
|---|---|---|---|
| `room:{roomId}` | Hash | Room metadata (hostUserId, status, routerId, etc.) | 24h |
| `room:{roomId}:participants` | Hash | userId → JSON(RoomParticipant) | 24h |
| `socket:user:{socketId}` | String | Maps socketId → userId | 2h |
| `user:socket:{userId}` | String | Maps userId → socketId | 2h |
| `active_rooms` | Set | Set of all active room IDs | none |

**RoomParticipant JSON:**
```json
{
  "userId": "uuid",
  "socketId": "socket-id",
  "role": "host|co_host|participant",
  "joinedAt": 1700000000000,
  "producerIds": ["producer-uuid-1"],
  "isMuted": false,
  "isVideoOff": false
}
```

## PostgreSQL Schema

### users
| Column | Type | Constraints |
|---|---|---|
| id | UUID (PK) | auto-generated |
| email | VARCHAR(255) | UNIQUE, INDEX |
| passwordHash | VARCHAR(255) | |
| displayName | VARCHAR(100) | |
| isActive | BOOLEAN | default true |
| createdAt | TIMESTAMPTZ | auto |
| updatedAt | TIMESTAMPTZ | auto |

### meetings
| Column | Type | Constraints |
|---|---|---|
| id | UUID (PK) | auto-generated |
| title | VARCHAR(255) | |
| roomCode | VARCHAR(20) | UNIQUE, INDEX |
| hostId | UUID (FK → users) | INDEX |
| status | ENUM | waiting/active/closed |
| maxParticipants | INT | default 100 |
| startedAt | TIMESTAMPTZ | nullable |
| endedAt | TIMESTAMPTZ | nullable |
| peakParticipants | INT | default 0 |
| createdAt | TIMESTAMPTZ | auto |
| updatedAt | TIMESTAMPTZ | auto |

### audit_logs
| Column | Type | Constraints |
|---|---|---|
| id | UUID (PK) | auto-generated |
| action | ENUM | AuditAction values |
| userId | UUID (FK → users) | nullable, INDEX |
| roomId | UUID | nullable, INDEX |
| metadata | JSONB | nullable |
| ipAddress | INET | nullable |
| createdAt | TIMESTAMPTZ | auto |

## Sequence Diagrams

### 1. User Joins Call

```
Client                     Gateway              AuthService       RoomsService         MediaService
  │                           │                      │                 │                    │
  │── WS connect (JWT) ──────►│                      │                 │                    │
  │                           │── verifyToken() ─────►│                 │                    │
  │                           │◄── JwtPayload ───────│                 │                    │
  │                           │── validateUser() ────►│                 │                    │
  │                           │◄── UserEntity ───────│                 │                    │
  │                           │                      │                 │                    │
  │                           │── Redis: map socket↔user ─────────────────────────────────►│
  │◄── connected ────────────│                      │                 │                    │
  │                           │                      │                 │                    │
  │── room:join {roomId} ────►│                      │                 │                    │
  │                           │── joinRoom() ────────────────────────►│                    │
  │                           │                      │                 │── Redis: check room│
  │                           │                      │                 │── Redis: check max │
  │                           │                      │                 │── Redis: add user  │
  │                           │                      │                 │── PG: update peak  │
  │                           │◄── {role, participants} ──────────────│                    │
  │                           │                      │                 │                    │
  │                           │── getOrCreateRouter() ────────────────────────────────────►│
  │                           │◄── router.rtpCapabilities ────────────────────────────────│
  │                           │                      │                 │                    │
  │                           │── socket.to(room).emit('userJoined') ─►│ (broadcast)       │
  │◄── {role, rtpCaps, producers} ──│               │                 │                    │
  │                           │                      │                 │                    │
```

### 2. User Publishes Video

```
Client                     Gateway              WebrtcService       MediaService
  │                           │                      │                    │
  │── media:createTransport ──►│                      │                    │
  │   {roomId, dir:'send'}    │── createTransport()──►│                    │
  │                           │                      │── createWebRtcTransport() ──────────►│
  │                           │                      │◄── {id, ice, dtls} ─────────────────│
  │◄── {id, iceParams, dtls} ─│◄── transport data ──│                    │
  │                           │                      │                    │
  │── media:connectTransport ─►│                      │                    │
  │   {transportId, dtls}     │── connectTransport()─►│                    │
  │                           │                      │── transport.connect(dtls) ──────────►│
  │◄── {connected: true} ────│◄── void ─────────────│                    │
  │                           │                      │                    │
  │── media:produce ──────────►│                      │                    │
  │   {transportId, kind,     │── produce() ─────────►│                    │
  │    rtpParams}             │                      │── transport.produce(kind,rtp) ──────►│
  │                           │                      │◄── producer ────────────────────────│
  │                           │                      │── Redis: addProducerToParticipant ──►│
  │                           │                      │── audit: PRODUCER_CREATED ──────────►│
  │◄── {producerId} ─────────│◄── {producerId} ─────│                    │
  │                           │                      │                    │
  │                           │── socket.to(room).emit('newProducer') ────────────────────►│
  │                           │   {producerId, userId, kind}             │
  │                           │                      │                    │
```

### 3. User Disconnects

```
Client                     Gateway              RoomsService       WebrtcService      Redis
  │                           │                      │                   │                │
  │── [TCP FIN / timeout] ───►│                      │                   │                │
  │                           │                      │                   │                │
  │                           │── cleanupUserMedia() ────────────────────►│                │
  │                           │                      │                   │── close transports
  │                           │                      │                   │── close producers
  │                           │                      │                   │── close consumers
  │                           │                      │                   │                │
  │                           │── leaveRoom() ───────►│                   │                │
  │                           │                      │── hdel participant ────────────────►│
  │                           │                      │── del socket maps  ────────────────►│
  │                           │                      │── hlen participants ───────────────►│
  │                           │                      │                   │                │
  │                           │                      │ if count == 0:    │                │
  │                           │                      │── closeRoom() ────────────────────►│
  │                           │                      │   del room:*      │                │
  │                           │                      │   srem active     │                │
  │                           │                      │── PG: update meeting status         │
  │                           │                      │── audit: ROOM_CLOSED               │
  │                           │                      │                   │                │
  │                           │── cleanupRoomMedia() ────────────────────►│ (if closed)    │
  │                           │                      │                   │── close router  │
  │                           │                      │                   │                │
  │                           │── emit to room: 'userLeft' or 'roomClosed' ──────────────►│
  │                           │                      │                   │                │
  │                           │── cleanupSocket() ───────────────────────────────────────►│
  │                           │                      │                   │        del maps│
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | HTTP/WS listen port | `3000` |
| `JWT_SECRET` | HMAC signing key | — (required) |
| `JWT_EXPIRATION` | Token TTL in seconds | `3600` |
| `POSTGRES_HOST` | PG hostname | `localhost` |
| `POSTGRES_PORT` | PG port | `5432` |
| `POSTGRES_USER` | PG username | `videoconf` |
| `POSTGRES_PASSWORD` | PG password | — (required) |
| `POSTGRES_DB` | PG database name | `videoconf` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis auth | — (optional) |
| `MEDIASOUP_LISTEN_IP` | mediasoup bind IP | `0.0.0.0` |
| `MEDIASOUP_ANNOUNCED_IP` | Public/NAT IP for ICE | `127.0.0.1` |
| `MEDIASOUP_MIN_PORT` | UDP port range start | `40000` |
| `MEDIASOUP_MAX_PORT` | UDP port range end | `49999` |
| `MEDIASOUP_NUM_WORKERS` | Worker process count | `2` |
| `MEDIASOUP_LOG_LEVEL` | debug/warn/error/none | `warn` |
| `MAX_PARTICIPANTS_PER_ROOM` | Hard cap per room | `100` |

## Security Model

1. **Socket Authentication**: JWT extracted from `socket.handshake.auth.token` or `Authorization` header on connection. No token → immediate disconnect.
2. **User Validation**: Token payload `sub` verified against `users` table. Deactivated users rejected.
3. **Room Authorization**: Host-only actions (close, mute all, kick, change role) enforced via Redis role checks.
4. **Rate Limiting**: Per-socket in-memory counter — 60 events per 60 seconds on mutating operations.
5. **Transport Security**: DTLS mandatory on all WebRTC transports. Invalid DTLS → transport auto-close.
6. **Audit Trail**: All state-changing actions logged to `audit_logs` table with user/room/metadata.

## Deployment Notes

- Set `MEDIASOUP_ANNOUNCED_IP` to your server's **public IP** for NAT traversal.
- For symmetric NAT, deploy Coturn TURN server alongside (included in docker-compose).
- Use `network_mode: host` in Docker for mediasoup UDP port binding.
- Scale workers with `MEDIASOUP_NUM_WORKERS` = number of CPU cores.
- In production, place behind nginx/HAProxy with WebSocket upgrade support.
