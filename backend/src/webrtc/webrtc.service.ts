import { Injectable, Logger } from '@nestjs/common';
import type { DtlsParameters, MediaKind, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types';
import { MediaService } from '../media/media.service';
import { RoomsService } from '../rooms/rooms.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../shared/enums';
import { WsMediaException } from '../shared/exceptions';

export interface TransportCreatedPayload {
  id: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
}

export interface ProduceResult {
  producerId: string;
}

export interface ConsumeResult {
  consumerId: string;
  producerId: string;
  kind: MediaKind;
  rtpParameters: RtpParameters;
}

@Injectable()
export class WebrtcService {
  private readonly logger = new Logger(WebrtcService.name);

  constructor(
    private readonly media: MediaService,
    private readonly rooms: RoomsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Initializes a mediasoup router for the room if one doesn't already exist.
   * Returns the router's RTP capabilities for the client.
   */
  async getRouterCapabilities(roomId: string): Promise<RtpCapabilities> {
    const router = await this.media.getOrCreateRouter(roomId);

    // Persist routerId in Redis room state
    await this.rooms.setRouterId(roomId, router.id);

    return this.media.getRouterRtpCapabilities(roomId);
  }

  /**
   * Creates a WebRTC transport for the user in the specified direction.
   */
  async createTransport(params: {
    roomId: string;
    userId: string;
    direction: 'send' | 'recv';
  }): Promise<TransportCreatedPayload> {
    const result = await this.media.createWebRtcTransport({
      roomId: params.roomId,
      userId: params.userId,
      direction: params.direction,
    });

    return {
      id: result.id,
      iceParameters: result.iceParameters as unknown as Record<string, unknown>,
      iceCandidates: result.iceCandidates as unknown as Record<string, unknown>[],
      dtlsParameters: result.dtlsParameters as unknown as Record<string, unknown>,
    };
  }

  /**
   * Connects a transport with the client-supplied DTLS parameters.
   */
  async connectTransport(params: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  }): Promise<void> {
    try {
      await this.media.connectTransport({
        transportId: params.transportId,
        dtlsParameters: params.dtlsParameters,
      });
    } catch (error) {
      this.logger.error(`Failed to connect transport: ${(error as Error).message}`);
      throw new WsMediaException(`Transport connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Produces media (audio or video) on a send transport.
   */
  async produce(params: {
    roomId: string;
    userId: string;
    transportId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
    appData?: Record<string, unknown>;
  }): Promise<ProduceResult> {
    try {
      const result = await this.media.produce({
        transportId: params.transportId,
        kind: params.kind,
        rtpParameters: params.rtpParameters,
        appData: params.appData,
      });

      // Track producer in Redis room state
      await this.rooms.addProducerToParticipant(
        params.roomId,
        params.userId,
        result.producerId,
      );

      await this.audit.log({
        action: AuditAction.PRODUCER_CREATED,
        userId: params.userId,
        roomId: params.roomId,
        metadata: { producerId: result.producerId, kind: params.kind },
      });

      return result;
    } catch (error) {
      if (error instanceof WsMediaException) throw error;
      this.logger.error(`Failed to produce: ${(error as Error).message}`);
      throw new WsMediaException(`Produce failed: ${(error as Error).message}`);
    }
  }

  /**
   * Consumes a remote producer's media by creating a consumer on a recv transport.
   */
  async consume(params: {
    roomId: string;
    userId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: RtpCapabilities;
  }): Promise<ConsumeResult> {
    try {
      const result = await this.media.consume({
        roomId: params.roomId,
        userId: params.userId,
        transportId: params.transportId,
        producerId: params.producerId,
        rtpCapabilities: params.rtpCapabilities,
      });

      await this.audit.log({
        action: AuditAction.CONSUMER_CREATED,
        userId: params.userId,
        roomId: params.roomId,
        metadata: { consumerId: result.consumerId, producerId: params.producerId },
      });

      return result;
    } catch (error) {
      if (error instanceof WsMediaException) throw error;
      this.logger.error(`Failed to consume: ${(error as Error).message}`);
      throw new WsMediaException(`Consume failed: ${(error as Error).message}`);
    }
  }

  /**
   * Resumes a consumer (unpauses receiving media).
   */
  async resumeConsumer(consumerId: string): Promise<void> {
    await this.media.resumeConsumer(consumerId);
  }

  /**
   * Closes a producer and notifies the room service.
   */
  async closeProducer(params: {
    roomId: string;
    userId: string;
    producerId: string;
  }): Promise<void> {
    await this.media.closeProducer(params.producerId);
    await this.rooms.removeProducerFromParticipant(
      params.roomId,
      params.userId,
      params.producerId,
    );

    await this.audit.log({
      action: AuditAction.PRODUCER_CLOSED,
      userId: params.userId,
      roomId: params.roomId,
      metadata: { producerId: params.producerId },
    });
  }

  /**
   * Pauses a producer (e.g., user mutes audio).
   */
  async pauseProducer(producerId: string): Promise<void> {
    await this.media.pauseProducer(producerId);
  }

  /**
   * Resumes a paused producer.
   */
  async resumeProducer(producerId: string): Promise<void> {
    await this.media.resumeProducer(producerId);
  }

  /**
   * Gets all producers in a room that a user hasn't produced themselves.
   */
  getExistingProducers(
    roomId: string,
    excludeUserId: string,
  ): Array<{ producerId: string; userId: string; kind: MediaKind }> {
    return this.media.getProducersForRoom(roomId, excludeUserId);
  }

  /**
   * Cleans up all media resources for a user in a room.
   */
  async cleanupUserMedia(roomId: string, userId: string): Promise<void> {
    await this.media.cleanupUser(roomId, userId);
  }

  /**
   * Cleans up all media resources for a room.
   */
  async cleanupRoomMedia(roomId: string): Promise<void> {
    await this.media.cleanupRoom(roomId);
  }
}
