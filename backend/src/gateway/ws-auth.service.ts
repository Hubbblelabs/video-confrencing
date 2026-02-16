import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '../redis/redis-keys';
import type { Socket } from 'socket.io';
import type { AuthenticatedSocket } from '../shared/interfaces';

/**
 * Extended Socket type with authenticated user data.
 */
export interface AppSocket extends Socket {
  data: AuthenticatedSocket;
}

@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Validates the JWT token from the handshake and attaches user data to the socket.
   * Returns null if the token is invalid.
   */
  async authenticateSocket(socket: Socket): Promise<AppSocket | null> {
    try {
      const token =
        socket.handshake.auth?.['token'] as string | undefined ??
        socket.handshake.headers?.['authorization']?.replace('Bearer ', '');

      this.logger.debug(`Socket ${socket.id} - Token present: ${!!token}, auth: ${JSON.stringify(socket.handshake.auth)}`);

      if (!token) {
        this.logger.warn(`Socket ${socket.id}: No token provided`);
        return null;
      }

      const payload = this.authService.verifyToken(token);
      this.logger.debug(`Socket ${socket.id} - Token verified for user: ${payload.sub}`);

      const user = await this.authService.validateUserById(payload.sub);
      if (!user) {
        this.logger.warn(`Socket ${socket.id}: User ${payload.sub} not found or inactive`);
        return null;
      }

      // Attach user data to socket
      const appSocket = socket as AppSocket;
      appSocket.data = {
        id: socket.id,
        userId: user.id,
        email: user.email,
        displayName: user.displayName,
        userRole: user.role,
      };

      this.logger.debug(`Socket ${socket.id} - Data attached: ${JSON.stringify(appSocket.data)}`);

      // Map socket ↔ user in Redis
      await this.redis.set(
        RedisKeys.socketToUser(socket.id),
        user.id,
        RedisKeys.SOCKET_TTL,
      );
      await this.redis.set(
        RedisKeys.userToSocket(user.id),
        socket.id,
        RedisKeys.SOCKET_TTL,
      );

      this.logger.log(`Socket authenticated: ${socket.id} → user ${user.id}`);
      return appSocket;
    } catch (error) {
      this.logger.warn(
        `Socket ${socket.id}: Authentication failed - ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Cleans up Redis entries on socket disconnect.
   */
  async cleanupSocket(socketId: string): Promise<string | null> {
    const userId = await this.redis.get(RedisKeys.socketToUser(socketId));
    if (userId) {
      await this.redis.del(
        RedisKeys.socketToUser(socketId),
        RedisKeys.userToSocket(userId),
      );
    }
    return userId;
  }
}
