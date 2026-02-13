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

  // Track waiting room participants: roomId -> userId -> participant data
  private readonly waitingRooms = new Map<string, Map<string, { userId: string; displayName: string; socketId: string; joinedAt: number }>>();

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly rooms: RoomsService,
    private readonly webrtc: WebrtcService,
  ) { }

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

    // Use the actual room ID (which may differ from requested if auto-created)
    const actualRoomId = result.roomId;

    // Track socket → room mapping
    this.socketRoomMap.set(socket.id, actualRoomId);
    socket.data.roomId = actualRoomId;
    socket.data.role = result.role;

    // Join the Socket.IO room
    await socket.join(actualRoomId);

    // Notify existing participants
    socket.to(actualRoomId).emit(WsEvents.USER_JOINED, {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      role: result.role,
      participants: result.participants,
    });

    // Return router capabilities + existing producers for the joining user
    const rtpCapabilities = await this.webrtc.getRouterCapabilities(actualRoomId);
    const existingProducers = this.webrtc.getExistingProducers(actualRoomId, socket.data.userId);

    const response = {
      roomId: actualRoomId, // Return the actual room ID to the client
      roomCode: result.roomCode,
      role: result.role,
      participants: result.participants,
      rtpCapabilities,
      existingProducers,
    };

    // If host/co-host, send waiting room list
    if (result.role === 'host' || result.role === 'co_host') {
      const waitingList = this.waitingRooms.get(actualRoomId);
      if (waitingList && waitingList.size > 0) {
        socket.emit(WsEvents.WAITING_ROOM_UPDATED, {
          participants: Array.from(waitingList.values()),
        });
      }
    }

    return response;
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

    const userId = socket.data.userId!;
    const roomId = await this.rooms.getRoomIdByUserId(userId);

    if (!roomId) {
      throw new Error('User not in any room');
    }

    await this.webrtc.pauseProducer(payload.producerId);

    // Broadcast to other users in the room
    socket.to(roomId).emit(WsEvents.PRODUCER_PAUSED, {
      userId,
      producerId: payload.producerId,
    });

    return { paused: true };
  }

  @SubscribeMessage(WsEvents.RESUME_PRODUCER)
  async handleResumeProducer(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: PauseResumeProducerPayload,
  ) {
    this.assertAuthenticated(socket);

    const userId = socket.data.userId!;
    const roomId = await this.rooms.getRoomIdByUserId(userId);

    if (!roomId) {
      throw new Error('User not in any room');
    }

    await this.webrtc.resumeProducer(payload.producerId);

    // Broadcast to other users in the room
    socket.to(roomId).emit(WsEvents.PRODUCER_RESUMED, {
      userId,
      producerId: payload.producerId,
    });

    return { resumed: true };
  }
  // ─── Whiteboard Events ────────────────────────────────────────

  @SubscribeMessage(WsEvents.WHITEBOARD_DRAW)
  async handleWhiteboardDraw(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; object: any },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast to all other users in the room
    socket.to(payload.roomId).emit(WsEvents.WHITEBOARD_OBJECT_ADDED, {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      object: payload.object,
    });

    return { success: true };
  }

  @SubscribeMessage(WsEvents.WHITEBOARD_CURSOR)
  async handleWhiteboardCursor(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; x: number; y: number },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast cursor position to all other users using volatile for efficiency
    socket.volatile.to(payload.roomId).emit(WsEvents.WHITEBOARD_CURSOR, {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      x: payload.x,
      y: payload.y,
    });

    return { success: true };
  }

  @SubscribeMessage(WsEvents.WHITEBOARD_CLEAR)
  async handleWhiteboardClear(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast clear to all users in the room
    this.server.to(payload.roomId).emit(WsEvents.WHITEBOARD_CLEAR, {
      userId: socket.data.userId,
    });

    return { success: true };
  }

  @SubscribeMessage(WsEvents.WHITEBOARD_OBJECT_MODIFIED)
  async handleWhiteboardModified(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; object: any },
  ) {
    this.assertAuthenticated(socket);

    socket.to(payload.roomId).emit(WsEvents.WHITEBOARD_OBJECT_MODIFIED, {
      userId: socket.data.userId,
      object: payload.object,
    });

    return { success: true };
  }

  @SubscribeMessage(WsEvents.WHITEBOARD_OBJECT_REMOVED)
  async handleWhiteboardRemoved(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; objectId: string },
  ) {
    this.assertAuthenticated(socket);

    socket.to(payload.roomId).emit(WsEvents.WHITEBOARD_OBJECT_REMOVED, {
      userId: socket.data.userId,
      objectId: payload.objectId,
    });

    return { success: true };
  }

  @SubscribeMessage(WsEvents.WHITEBOARD_STATE)
  async handleWhiteboardState(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; active: boolean },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast state change to all other users in the room
    socket.to(payload.roomId).emit(WsEvents.WHITEBOARD_STATE, {
      userId: socket.data.userId,
      active: payload.active,
    });

    return { success: true };
  }

  // ─── Chat Events ──────────────────────────────────────────────

  @SubscribeMessage(WsEvents.CHAT_MESSAGE)
  async handleChatMessage(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; message: string },
  ) {
    this.assertAuthenticated(socket);

    const messageData = {
      id: `${Date.now()}-${socket.data.userId}`,
      roomId: payload.roomId,
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      message: payload.message,
      timestamp: new Date().toISOString(),
      type: 'text',
    };

    // Broadcast to all users in the room (including sender)
    this.server.to(payload.roomId).emit(WsEvents.CHAT_MESSAGE_RECEIVED, messageData);

    return { success: true, messageId: messageData.id };
  }

  @SubscribeMessage(WsEvents.CHAT_PRIVATE_MESSAGE)
  async handlePrivateMessage(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; targetUserId: string; message: string },
  ) {
    this.assertAuthenticated(socket);

    const messageData = {
      id: `${Date.now()}-${socket.data.userId}`,
      roomId: payload.roomId,
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      targetUserId: payload.targetUserId,
      message: payload.message,
      timestamp: new Date().toISOString(),
      type: 'private',
    };

    // Find target socket and send to both sender and target
    const sockets = await this.server.in(payload.roomId).fetchSockets();
    const targetSocket = sockets.find((s: any) => s.data.userId === payload.targetUserId);

    if (targetSocket) {
      // Send to target
      targetSocket.emit(WsEvents.CHAT_PRIVATE_MESSAGE_RECEIVED, messageData);
      // Send back to sender
      socket.emit(WsEvents.CHAT_PRIVATE_MESSAGE_RECEIVED, messageData);
      return { success: true, messageId: messageData.id };
    }

    return { success: false, error: 'User not found' };
  }

  @SubscribeMessage(WsEvents.CHAT_FILE_UPLOAD)
  async handleFileUpload(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; fileName: string; fileType: string; fileData: string; fileSize: number },
  ) {
    this.assertAuthenticated(socket);

    const messageData = {
      id: `${Date.now()}-${socket.data.userId}`,
      roomId: payload.roomId,
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      fileName: payload.fileName,
      fileType: payload.fileType,
      fileData: payload.fileData,
      fileSize: payload.fileSize,
      timestamp: new Date().toISOString(),
      type: 'file',
    };

    // Broadcast to all users in the room
    this.server.to(payload.roomId).emit(WsEvents.CHAT_FILE_RECEIVED, messageData);

    return { success: true, messageId: messageData.id };
  }

  @SubscribeMessage(WsEvents.CHAT_TYPING)
  async handleTyping(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; isTyping: boolean },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast typing status to all other users using volatile
    socket.volatile.to(payload.roomId).emit(WsEvents.CHAT_USER_TYPING, {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      isTyping: payload.isTyping,
    });

    return { success: true };
  }

  // ─── Reaction / Hand Raise Events ─────────────────────────────

  @SubscribeMessage(WsEvents.HAND_RAISE)
  async handleHandRaise(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    this.assertAuthenticated(socket);

    const isRaised = await this.rooms.toggleHandRaise(payload.roomId, socket.data.userId);

    // Broadcast to room
    this.server.to(payload.roomId).emit(WsEvents.HAND_RAISED, {
      userId: socket.data.userId,
      handRaised: isRaised,
    });

    return { success: true, handRaised: isRaised };
  }

  @SubscribeMessage(WsEvents.REACTION)
  async handleReaction(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; reaction: string },
  ) {
    this.assertAuthenticated(socket);

    // Broadcast transient event to room (no persistence needed)
    socket.to(payload.roomId).emit(WsEvents.REACTION_RECEIVED, {
      userId: socket.data.userId,
      reaction: payload.reaction,
    });

    return { success: true };
  }

  // ─── Waiting Room Events ──────────────────────────────────────

  @SubscribeMessage(WsEvents.JOIN_WAITING_ROOM)
  async handleJoinWaitingRoom(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    this.assertAuthenticated(socket);

    // Resolve room ID if code is provided
    const roomId = await this.rooms.resolveRoomId(payload.roomId) || payload.roomId;

    // Check if user is host - if so, auto-admit
    const room = await this.rooms.getRoomState(roomId);
    if (room && room.hostUserId === socket.data.userId) {
      // Host joins directly, emit admission event
      socket.emit(WsEvents.PARTICIPANT_ADMITTED, {
        roomId: roomId,
        message: 'Welcome back, host!',
      });

      this.logger.log(`Host ${socket.data.userId} auto-admitted to room ${roomId}`);

      return {
        success: true,
        message: 'You are the host. Joining room...',
        isHost: true,
      };
    }

    // Identify participant
    const participant = {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      socketId: socket.id,
      joinedAt: Date.now(),
    };

    // Initialize waiting room for this roomId if it doesn't exist
    // Use the RESOLVED roomId
    if (!this.waitingRooms.has(roomId)) {
      this.waitingRooms.set(roomId, new Map());
    }

    this.waitingRooms.get(roomId)!.set(socket.data.userId, participant);

    // Notify host(s)
    if (room && room.hostUserId) {
      // Notify everyone in the room (including host) that waiting room updated
      this.server.to(roomId).emit(WsEvents.WAITING_ROOM_UPDATED, {
        participants: Array.from(this.waitingRooms.get(roomId)!.values()),
      });
      // Also notify host specifically via private message? Not needed if room broadcast works.
    }

    return {
      success: true,
      message: 'Waiting for host approval...',
      roomId: roomId // Return resolved UUID so client can update tracking
    };
  }




  @SubscribeMessage(WsEvents.ADMIT_PARTICIPANT)
  async handleAdmitParticipant(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; userId: string },
  ) {
    this.assertAuthenticated(socket);

    // Check if user is host
    const room = await this.rooms.getRoomState(payload.roomId);
    if (!room || room.hostUserId !== socket.data.userId) {
      return { success: false, error: 'Only the host can admit participants' };
    }

    const roomWaitingList = this.waitingRooms.get(payload.roomId);
    if (!roomWaitingList) {
      return { success: false, error: 'No waiting room found' };
    }

    const participant = roomWaitingList.get(payload.userId);
    if (!participant) {
      return { success: false, error: 'Participant not found in waiting room' };
    }

    // Get the socket of the waiting participant
    const sockets = await this.server.fetchSockets();
    const participantSocket = sockets.find(s => s.id === participant.socketId);

    if (participantSocket) {
      // Notify participant they've been admitted
      participantSocket.emit(WsEvents.PARTICIPANT_ADMITTED, {
        roomId: payload.roomId,
      });

      // Remove from waiting room
      roomWaitingList.delete(payload.userId);

      // Notify host about updated waiting room
      this.server.to(payload.roomId).emit(WsEvents.WAITING_ROOM_UPDATED, {
        participants: Array.from(roomWaitingList.values()),
        waitingCount: roomWaitingList.size,
      });

      this.logger.log(`User ${payload.userId} admitted to ${payload.roomId}`);
      return { success: true };
    }

    return { success: false, error: 'Participant socket not found' };
  }

  @SubscribeMessage(WsEvents.REJECT_PARTICIPANT)
  async handleRejectParticipant(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string; userId: string },
  ) {
    this.assertAuthenticated(socket);

    // Check if user is host
    const room = await this.rooms.getRoomState(payload.roomId);
    if (!room || room.hostUserId !== socket.data.userId) {
      return { success: false, error: 'Only the host can reject participants' };
    }

    const roomWaitingList = this.waitingRooms.get(payload.roomId);
    if (!roomWaitingList) {
      return { success: false, error: 'No waiting room found' };
    }

    const participant = roomWaitingList.get(payload.userId);
    if (!participant) {
      return { success: false, error: 'Participant not found in waiting room' };
    }

    // Get the socket of the waiting participant
    const sockets = await this.server.fetchSockets();
    const participantSocket = sockets.find(s => s.id === participant.socketId);

    if (participantSocket) {
      // Notify participant they've been rejected
      participantSocket.emit(WsEvents.PARTICIPANT_REJECTED, {
        roomId: payload.roomId,
        message: 'The host denied your request to join',
      });

      // Remove from waiting room
      roomWaitingList.delete(payload.userId);

      // Notify host about updated waiting room
      this.server.to(payload.roomId).emit(WsEvents.WAITING_ROOM_UPDATED, {
        participants: Array.from(roomWaitingList.values()),
        waitingCount: roomWaitingList.size,
      });

      this.logger.log(`User ${payload.userId} rejected from ${payload.roomId}`);
      return { success: true };
    }

    return { success: false, error: 'Participant socket not found' };
  }

  @SubscribeMessage(WsEvents.ADMIT_ALL)
  async handleAdmitAll(
    @ConnectedSocket() socket: AppSocket,
    @MessageBody() payload: { roomId: string },
  ) {
    this.assertAuthenticated(socket);

    // Check if user is host
    const room = await this.rooms.getRoomState(payload.roomId);
    if (!room || room.hostUserId !== socket.data.userId) {
      return { success: false, error: 'Only the host can admit participants' };
    }

    const roomWaitingList = this.waitingRooms.get(payload.roomId);
    if (!roomWaitingList || roomWaitingList.size === 0) {
      return { success: false, error: 'No participants in waiting room' };
    }

    const sockets = await this.server.fetchSockets();
    let admittedCount = 0;

    // Admit all participants
    for (const participant of roomWaitingList.values()) {
      const participantSocket = sockets.find(s => s.id === participant.socketId);
      if (participantSocket) {
        participantSocket.emit(WsEvents.PARTICIPANT_ADMITTED, {
          roomId: payload.roomId,
        });
        admittedCount++;
      }
    }

    // Clear waiting room
    roomWaitingList.clear();

    // Notify host about updated waiting room
    this.server.to(payload.roomId).emit(WsEvents.WAITING_ROOM_UPDATED, {
      participants: [],
      waitingCount: 0,
    });

    this.logger.log(`${admittedCount} participants admitted to ${payload.roomId}`);
    return { success: true, admittedCount };
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
