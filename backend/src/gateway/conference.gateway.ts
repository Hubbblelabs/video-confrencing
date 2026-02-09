import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';
import { WsAuthService, AppSocket } from './ws-auth.service';
import { RoomsService } from '../rooms/rooms.service';
import { WebrtcService } from '../webrtc/webrtc.service';
import { WsEvents } from './ws-events';
import { RoomRole } from '../shared/enums';
import { WsExceptionFilter } from './ws-exception.filter';

// ─── Payload Interfaces ───────────────────────────────────────────

interface CreateRoomPayload {
  title: string;
  maxParticipants?: number;
}

interface JoinRoomPayload {
  roomId: string;
}

interface LeaveRoomPayload {
  roomId: string;
}

interface CloseRoomPayload {
  roomId: string;
}

interface KickUserPayload {
  roomId: string;
  targetUserId: string;
}

interface MuteAllPayload {
  roomId: string;
}

interface ChangeRolePayload {
  roomId: string;
  targetUserId: string;
  newRole: 'co_host' | 'participant';
}

interface GetRouterCapabilitiesPayload {
  roomId: string;
}

interface CreateTransportPayload {
  roomId: string;
  direction: 'send' | 'recv';
}

interface ConnectTransportPayload {
  transportId: string;
  dtlsParameters: DtlsParameters;
}

interface ProducePayload {
  roomId: string;
  transportId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
  appData?: Record<string, unknown>;
}

interface ConsumePayload {
  roomId: string;
  transportId: string;
  producerId: string;
  rtpCapabilities: RtpCapabilities;
}

interface ResumeConsumerPayload {
  consumerId: string;
}

interface CloseProducerPayload {
  roomId: string;
  producerId: string;
}

interface PauseResumeProducerPayload {
  producerId: string;
}

// ─── Rate Limiter ─────────────────────────────────────────────────

class SocketRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  isRateLimited(socketId: string, maxHits: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = this.hits.get(socketId);

    if (!entry || now > entry.resetAt) {
      this.hits.set(socketId, { count: 1, resetAt: now + windowMs });
      return false;
    }

    entry.count++;
    return entry.count > maxHits;
  }

  cleanup(socketId: string): void {
    this.hits.delete(socketId);
  }
}

// ─── Gateway ──────────────────────────────────────────────────────

@WebSocketGateway({
  cors: {
    origin: '*', // Lock this down in production
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 20000,
})
@UseFilters(new WsExceptionFilter())
@UsePipes(new ValidationPipe({ whitelist: true }))
export class ConferenceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(ConferenceGateway.name);
  private readonly rateLimiter = new SocketRateLimiter();

  // Track which room each socket is in for disconnect cleanup
  private readonly socketRoomMap = new Map<string, string>();

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly rooms: RoomsService,
    private readonly webrtc: WebrtcService,
  ) {}

  // ─── Connection Lifecycle ─────────────────────────────────────

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.log(`Connection attempt: ${socket.id}`);
    const appSocket = await this.wsAuth.authenticateSocket(socket);

    if (!appSocket) {
      this.logger.warn(`Unauthenticated connection rejected: ${socket.id}`);
      socket.emit(WsEvents.ERROR, { message: 'Authentication failed' });
      socket.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${socket.id} (user: ${appSocket.data.userId})`);
    this.logger.debug(`Socket data after auth: ${JSON.stringify((socket as AppSocket).data)}`);
    
    // Notify client that authentication is complete
    socket.emit(WsEvents.AUTHENTICATED, { userId: appSocket.data.userId });
  }

  async handleDisconnect(socket: Socket): Promise<void> {
    const appSocket = socket as AppSocket;
    const userId = appSocket.data?.userId;
    const roomId = this.socketRoomMap.get(socket.id);

    this.rateLimiter.cleanup(socket.id);

    if (userId && roomId) {
      try {
        // Clean up media
        await this.webrtc.cleanupUserMedia(roomId, userId);

        // Leave room
        const result = await this.rooms.leaveRoom({
          roomId,
          userId,
          socketId: socket.id,
        });

        this.socketRoomMap.delete(socket.id);

        if (result.roomClosed) {
          await this.webrtc.cleanupRoomMedia(roomId);
          this.server.to(roomId).emit(WsEvents.ROOM_CLOSED, { roomId });
        } else {
          this.server.to(roomId).emit(WsEvents.USER_LEFT, {
            userId,
            participants: result.remainingParticipants,
          });
        }
      } catch (error) {
        this.logger.error(
          `Error during disconnect cleanup for ${socket.id}: ${(error as Error).message}`,
        );
      }
    }

    await this.wsAuth.cleanupSocket(socket.id);
    this.logger.log(`Client disconnected: ${socket.id}`);
  }

  // ─── Room Events ──────────────────────────────────────────────

  @SubscribeMessage(WsEvents.CREATE_ROOM)
  async handleCreateRoom(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: CreateRoomPayload,
  ) {
    this.logger.debug(`CREATE_ROOM called by socket ${socket.id}, socket.data: ${JSON.stringify(socket.data)}`);
    this.assertAuthenticated(socket);
    this.assertRateLimit(socket);

    const result = await this.rooms.createRoom({
      hostUserId: socket.data.userId,
      title: payload.title,
      maxParticipants: payload.maxParticipants,
    });

    return result;
  }

  @SubscribeMessage(WsEvents.JOIN_ROOM)
  async handleJoinRoom(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    this.assertAuthenticated(socket);
    this.assertRateLimit(socket);

    const result = await this.rooms.joinRoom({
      roomId: payload.roomId,
      userId: socket.data.userId,
      socketId: socket.id,
    });

    // Track socket → room mapping
    this.socketRoomMap.set(socket.id, payload.roomId);
    socket.data.roomId = payload.roomId;
    socket.data.role = result.role;

    // Join the Socket.IO room
    await socket.join(payload.roomId);

    // Notify existing participants
    socket.to(payload.roomId).emit(WsEvents.USER_JOINED, {
      userId: socket.data.userId,
      role: result.role,
      participants: result.participants,
    });

    // Return router capabilities + existing producers for the joining user
    const rtpCapabilities = await this.webrtc.getRouterCapabilities(payload.roomId);
    const existingProducers = this.webrtc.getExistingProducers(payload.roomId, socket.data.userId);

    return {
      role: result.role,
      participants: result.participants,
      rtpCapabilities,
      existingProducers,
    };
  }

  @SubscribeMessage(WsEvents.LEAVE_ROOM)
  async handleLeaveRoom(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: LeaveRoomPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.cleanupUserMedia(payload.roomId, socket.data.userId);

    const result = await this.rooms.leaveRoom({
      roomId: payload.roomId,
      userId: socket.data.userId,
      socketId: socket.id,
    });

    this.socketRoomMap.delete(socket.id);
    await socket.leave(payload.roomId);

    if (result.roomClosed) {
      await this.webrtc.cleanupRoomMedia(payload.roomId);
      this.server.to(payload.roomId).emit(WsEvents.ROOM_CLOSED, { roomId: payload.roomId });
    } else {
      this.server.to(payload.roomId).emit(WsEvents.USER_LEFT, {
        userId: socket.data.userId,
        participants: result.remainingParticipants,
      });
    }

    return { success: true };
  }

  @SubscribeMessage(WsEvents.CLOSE_ROOM)
  async handleCloseRoom(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: CloseRoomPayload,
  ) {
    this.assertAuthenticated(socket);

    // Only host can close
    const participant = await this.rooms.getParticipant(payload.roomId, socket.data.userId);
    if (!participant || participant.role !== RoomRole.HOST) {
      throw new Error('Only the host can close the room');
    }

    await this.webrtc.cleanupRoomMedia(payload.roomId);
    await this.rooms.closeRoom(payload.roomId, socket.data.userId);

    this.server.to(payload.roomId).emit(WsEvents.ROOM_CLOSED, { roomId: payload.roomId });

    // Remove all sockets from the room
    const sockets = await this.server.in(payload.roomId).fetchSockets();
    for (const s of sockets) {
      this.socketRoomMap.delete(s.id);
      s.leave(payload.roomId);
    }

    return { success: true };
  }

  @SubscribeMessage(WsEvents.KICK_USER)
  async handleKickUser(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: KickUserPayload,
  ) {
    this.assertAuthenticated(socket);

    const result = await this.rooms.kickUser({
      roomId: payload.roomId,
      requestingUserId: socket.data.userId,
      targetUserId: payload.targetUserId,
    });

    if (result.kickedSocketId) {
      // Notify kicked user
      this.server.to(result.kickedSocketId).emit(WsEvents.USER_KICKED, {
        roomId: payload.roomId,
        reason: 'You have been removed from the meeting',
      });

      // Clean up the kicked user's media
      await this.webrtc.cleanupUserMedia(payload.roomId, payload.targetUserId);

      const kickedSocket = this.server.sockets.sockets.get(result.kickedSocketId);
      if (kickedSocket) {
        this.socketRoomMap.delete(result.kickedSocketId);
        await kickedSocket.leave(payload.roomId);
      }

      // Notify remaining participants
      const participants = await this.rooms.getParticipants(payload.roomId);
      socket.to(payload.roomId).emit(WsEvents.USER_LEFT, {
        userId: payload.targetUserId,
        kicked: true,
        participants,
      });
    }

    return { success: true };
  }

  @SubscribeMessage(WsEvents.MUTE_ALL)
  async handleMuteAll(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: MuteAllPayload,
  ) {
    this.assertAuthenticated(socket);

    const mutedSocketIds = await this.rooms.muteAll(payload.roomId, socket.data.userId);

    for (const socketId of mutedSocketIds) {
      this.server.to(socketId).emit(WsEvents.ALL_MUTED, {
        roomId: payload.roomId,
        mutedBy: socket.data.userId,
      });
    }

    return { success: true, mutedCount: mutedSocketIds.length };
  }

  @SubscribeMessage(WsEvents.CHANGE_ROLE)
  async handleChangeRole(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: ChangeRolePayload,
  ) {
    this.assertAuthenticated(socket);

    const roleEnum = payload.newRole === 'co_host' ? RoomRole.CO_HOST : RoomRole.PARTICIPANT;

    await this.rooms.changeRole({
      roomId: payload.roomId,
      requestingUserId: socket.data.userId,
      targetUserId: payload.targetUserId,
      newRole: roleEnum,
    });

    this.server.to(payload.roomId).emit(WsEvents.ROLE_CHANGED, {
      userId: payload.targetUserId,
      newRole: payload.newRole,
    });

    return { success: true };
  }

  // ─── WebRTC / Media Events ────────────────────────────────────

  @SubscribeMessage(WsEvents.GET_ROUTER_CAPABILITIES)
  async handleGetRouterCapabilities(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: GetRouterCapabilitiesPayload,
  ) {
    this.assertAuthenticated(socket);

    const rtpCapabilities = await this.webrtc.getRouterCapabilities(payload.roomId);

    return { rtpCapabilities };
  }

  @SubscribeMessage(WsEvents.CREATE_TRANSPORT)
  async handleCreateTransport(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: CreateTransportPayload,
  ) {
    this.assertAuthenticated(socket);
    this.assertRateLimit(socket);

    const transport = await this.webrtc.createTransport({
      roomId: payload.roomId,
      userId: socket.data.userId,
      direction: payload.direction,
    });

    return transport;
  }

  @SubscribeMessage(WsEvents.CONNECT_TRANSPORT)
  async handleConnectTransport(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: ConnectTransportPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.connectTransport({
      transportId: payload.transportId,
      dtlsParameters: payload.dtlsParameters,
    });

    return { connected: true };
  }

  @SubscribeMessage(WsEvents.PRODUCE)
  async handleProduce(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: ProducePayload,
  ) {
    this.assertAuthenticated(socket);
    this.assertRateLimit(socket);

    const result = await this.webrtc.produce({
      roomId: payload.roomId,
      userId: socket.data.userId,
      transportId: payload.transportId,
      kind: payload.kind,
      rtpParameters: payload.rtpParameters,
      appData: payload.appData,
    });

    // Notify other participants about the new producer
    socket.to(payload.roomId).emit(WsEvents.NEW_PRODUCER, {
      producerId: result.producerId,
      userId: socket.data.userId,
      kind: payload.kind,
    });

    return result;
  }

  @SubscribeMessage(WsEvents.CONSUME)
  async handleConsume(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: ConsumePayload,
  ) {
    this.assertAuthenticated(socket);

    const result = await this.webrtc.consume({
      roomId: payload.roomId,
      userId: socket.data.userId,
      transportId: payload.transportId,
      producerId: payload.producerId,
      rtpCapabilities: payload.rtpCapabilities,
    });

    return result;
  }

  @SubscribeMessage(WsEvents.RESUME_CONSUMER)
  async handleResumeConsumer(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: ResumeConsumerPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.resumeConsumer(payload.consumerId);

    return { resumed: true };
  }

  @SubscribeMessage(WsEvents.CLOSE_PRODUCER)
  async handleCloseProducer(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: CloseProducerPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.closeProducer({
      roomId: payload.roomId,
      userId: socket.data.userId,
      producerId: payload.producerId,
    });

    // Notify room about producer being closed
    socket.to(payload.roomId).emit(WsEvents.PRODUCER_CLOSED, {
      producerId: payload.producerId,
      userId: socket.data.userId,
    });

    return { closed: true };
  }

  @SubscribeMessage(WsEvents.PAUSE_PRODUCER)
  async handlePauseProducer(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: PauseResumeProducerPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.pauseProducer(payload.producerId);

    return { paused: true };
  }

  @SubscribeMessage(WsEvents.RESUME_PRODUCER)
  async handleResumeProducer(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: PauseResumeProducerPayload,
  ) {
    this.assertAuthenticated(socket);

    await this.webrtc.resumeProducer(payload.producerId);

    return { resumed: true };
  }

  // ─── Guards ───────────────────────────────────────────────────

  private assertAuthenticated(socket: AppSocket): void {
    if (!socket.data?.userId) {
      throw new Error('Socket not authenticated');
    }
  }

  private assertRateLimit(socket: AppSocket): void {
    if (this.rateLimiter.isRateLimited(socket.id, 60, 60_000)) {
      throw new Error('Rate limit exceeded');
    }
  }
}
