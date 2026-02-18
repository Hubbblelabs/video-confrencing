import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import type {
  Worker,
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCodecCapability,
  DtlsParameters,
  RtpParameters,
  MediaKind,
  RtpCapabilities,
  WebRtcTransportOptions,
} from 'mediasoup/node/lib/types';
import { WsMediaException } from '../shared/exceptions';
import { getLocalLanIp } from '../shared/network.utils';

interface TransportContext {
  transport: WebRtcTransport;
  roomId: string;
  userId: string;
  direction: 'send' | 'recv';
}

interface ProducerContext {
  producer: Producer;
  roomId: string;
  userId: string;
}

interface ConsumerContext {
  consumer: Consumer;
  roomId: string;
  userId: string;
  producerId: string;
}

@Injectable()
export class MediaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaService.name);

  private workers: Worker[] = [];
  private nextWorkerIndex = 0;

  // roomId → Router
  private readonly routers = new Map<string, Router>();

  // transportId → TransportContext
  private readonly transports = new Map<string, TransportContext>();

  // producerId → ProducerContext
  private readonly producers = new Map<string, ProducerContext>();

  // consumerId → ConsumerContext
  private readonly consumers = new Map<string, ConsumerContext>();

  private mediaCodecs: RtpCodecCapability[] = [];
  private listenIp = '0.0.0.0';
  private announcedIp = '127.0.0.1';
  private minPort = 40000;
  private maxPort = 49999;

  constructor(private readonly config: ConfigService) { }

  async onModuleInit(): Promise<void> {
    this.listenIp = this.config.get<string>('mediasoup.listenIp', '0.0.0.0');
    this.announcedIp = this.config.get<string>('mediasoup.announcedIp', '127.0.0.1');

    // Auto-detect LAN IP if localhost is configured (common in dev)
    if (this.announcedIp === '127.0.0.1' || this.announcedIp === '0.0.0.0') {
      const lanIp = getLocalLanIp();
      if (lanIp && lanIp !== '127.0.0.1') {
        this.logger.warn(`Auto-detected LAN IP: ${lanIp}. Using this as announced IP instead of ${this.announcedIp} for cross-device access.`);
        this.announcedIp = lanIp;
      }
    }

    this.minPort = this.config.get<number>('mediasoup.minPort', 40000);
    this.maxPort = this.config.get<number>('mediasoup.maxPort', 49999);
    this.mediaCodecs = this.config.get<RtpCodecCapability[]>('mediasoup.mediaCodecs', []);

    const numWorkers = this.config.get<number>('mediasoup.numWorkers', 2);
    const logLevel = this.config.get<string>('mediasoup.logLevel', 'warn') as
      | 'debug'
      | 'warn'
      | 'error'
      | 'none';

    this.logger.log(`Creating ${numWorkers} mediasoup workers...`);

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker({
        logLevel,
        rtcMinPort: this.minPort,
        rtcMaxPort: this.maxPort,
      });

      worker.on('died', () => {
        this.logger.error(`mediasoup Worker ${worker.pid} died. Exiting in 2 seconds...`);
        setTimeout(() => process.exit(1), 2000);
      });

      this.workers.push(worker);
      this.logger.log(`mediasoup Worker ${worker.pid} created`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
    this.routers.clear();
    this.transports.clear();
    this.producers.clear();
    this.consumers.clear();
    this.logger.log('All mediasoup workers closed');
  }

  // ─── Router Management ──────────────────────────────────────────

  async getOrCreateRouter(roomId: string): Promise<Router> {
    const existing = this.routers.get(roomId);
    if (existing && !existing.closed) {
      return existing;
    }

    const worker = this.getNextWorker();
    const router = await worker.createRouter({ mediaCodecs: this.mediaCodecs });

    this.routers.set(roomId, router);
    this.logger.log(`Router created for room ${roomId} on worker ${worker.pid}`);

    return router;
  }

  getRouterRtpCapabilities(roomId: string): RtpCapabilities {
    const router = this.routers.get(roomId);
    if (!router || router.closed) {
      throw new WsMediaException('Router not found for room');
    }
    return router.rtpCapabilities;
  }

  // ─── Transport Management ───────────────────────────────────────

  async createWebRtcTransport(params: {
    roomId: string;
    userId: string;
    direction: 'send' | 'recv';
  }): Promise<{
    id: string;
    iceParameters: WebRtcTransport['iceParameters'];
    iceCandidates: WebRtcTransport['iceCandidates'];
    dtlsParameters: WebRtcTransport['dtlsParameters'];
  }> {
    const router = this.routers.get(params.roomId);
    if (!router || router.closed) {
      throw new WsMediaException('Router not found for room');
    }

    const transportOptions: WebRtcTransportOptions = {
      listenInfos: [
        {
          protocol: 'udp',
          ip: this.listenIp,
          announcedAddress: this.announcedIp,
        },
        {
          protocol: 'tcp',
          ip: this.listenIp,
          announcedAddress: this.announcedIp,
        },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      appData: {
        roomId: params.roomId,
        userId: params.userId,
        direction: params.direction,
      },
    };

    const transport = await router.createWebRtcTransport(transportOptions);

    // Auto-close on 30s of no DTLS activity
    transport.on('dtlsstatechange', (dtlsState: string) => {
      if (dtlsState === 'failed' || dtlsState === 'closed') {
        this.logger.warn(
          `Transport ${transport.id} DTLS state: ${dtlsState}. Closing.`,
        );
        transport.close();
        this.transports.delete(transport.id);
      }
    });

    transport.on('@close', () => {
      this.transports.delete(transport.id);
    });

    this.transports.set(transport.id, {
      transport,
      roomId: params.roomId,
      userId: params.userId,
      direction: params.direction,
    });

    this.logger.log(
      `WebRTC transport created: ${transport.id} (${params.direction}) for user ${params.userId} in room ${params.roomId}`,
    );

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(params: {
    transportId: string;
    dtlsParameters: DtlsParameters;
  }): Promise<void> {
    const ctx = this.transports.get(params.transportId);
    if (!ctx) {
      throw new WsMediaException('Transport not found');
    }

    await ctx.transport.connect({ dtlsParameters: params.dtlsParameters });
    this.logger.log(`Transport connected: ${params.transportId}`);
  }

  // ─── Producer Management ────────────────────────────────────────

  async produce(params: {
    transportId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
    appData?: Record<string, unknown>;
  }): Promise<{ producerId: string }> {
    const ctx = this.transports.get(params.transportId);
    if (!ctx) {
      throw new WsMediaException('Transport not found');
    }

    if (ctx.direction !== 'send') {
      throw new WsMediaException('Cannot produce on a recv transport');
    }

    const producer = await ctx.transport.produce({
      kind: params.kind,
      rtpParameters: params.rtpParameters,
      appData: {
        ...params.appData,
        roomId: ctx.roomId,
        userId: ctx.userId,
      },
    });

    producer.on('@close', () => {
      this.producers.delete(producer.id);
      this.logger.log(`Producer closed: ${producer.id}`);
    });

    this.producers.set(producer.id, {
      producer,
      roomId: ctx.roomId,
      userId: ctx.userId,
    });

    this.logger.log(
      `Producer created: ${producer.id} (${params.kind}) by user ${ctx.userId} in room ${ctx.roomId}`,
    );

    return { producerId: producer.id };
  }

  async closeProducer(producerId: string): Promise<void> {
    const ctx = this.producers.get(producerId);
    if (!ctx) return;

    ctx.producer.close();
    this.producers.delete(producerId);
    this.logger.log(`Producer explicitly closed: ${producerId}`);
  }

  async pauseProducer(producerId: string): Promise<{ kind: string }> {
    const ctx = this.producers.get(producerId);
    if (!ctx) throw new WsMediaException('Producer not found');
    await ctx.producer.pause();
    return { kind: ctx.producer.kind };
  }

  async resumeProducer(producerId: string): Promise<{ kind: string }> {
    const ctx = this.producers.get(producerId);
    if (!ctx) throw new WsMediaException('Producer not found');
    await ctx.producer.resume();
    return { kind: ctx.producer.kind };
  }

  // ─── Consumer Management ────────────────────────────────────────

  async consume(params: {
    roomId: string;
    userId: string;
    transportId: string;
    producerId: string;
    rtpCapabilities: RtpCapabilities;
  }): Promise<{
    consumerId: string;
    producerId: string;
    kind: MediaKind;
    rtpParameters: RtpParameters;
  }> {
    const router = this.routers.get(params.roomId);
    if (!router || router.closed) {
      throw new WsMediaException('Router not found');
    }

    if (!router.canConsume({ producerId: params.producerId, rtpCapabilities: params.rtpCapabilities })) {
      throw new WsMediaException('Cannot consume this producer with given RTP capabilities');
    }

    const ctx = this.transports.get(params.transportId);
    if (!ctx) {
      throw new WsMediaException('Transport not found');
    }

    if (ctx.direction !== 'recv') {
      throw new WsMediaException('Cannot consume on a send transport');
    }

    const consumer = await ctx.transport.consume({
      producerId: params.producerId,
      rtpCapabilities: params.rtpCapabilities,
      paused: true, // Start paused, client resumes after setup
      appData: {
        roomId: params.roomId,
        userId: params.userId,
        producerId: params.producerId,
      },
    });

    consumer.on('@close', () => {
      this.consumers.delete(consumer.id);
    });

    this.consumers.set(consumer.id, {
      consumer,
      roomId: params.roomId,
      userId: params.userId,
      producerId: params.producerId,
    });

    this.logger.log(
      `Consumer created: ${consumer.id} for producer ${params.producerId} in room ${params.roomId}`,
    );

    return {
      consumerId: consumer.id,
      producerId: params.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
    };
  }

  async resumeConsumer(consumerId: string): Promise<void> {
    const ctx = this.consumers.get(consumerId);
    if (!ctx) throw new WsMediaException('Consumer not found');
    await ctx.consumer.resume();
  }

  async closeConsumer(consumerId: string): Promise<void> {
    const ctx = this.consumers.get(consumerId);
    if (!ctx) return;

    ctx.consumer.close();
    this.consumers.delete(consumerId);
  }

  // ─── Cleanup ────────────────────────────────────────────────────

  /**
   * Cleans up all media resources for a specific user in a room.
   */
  async cleanupUser(roomId: string, userId: string): Promise<void> {
    // Close all transports for this user in this room
    for (const [transportId, ctx] of this.transports.entries()) {
      if (ctx.roomId === roomId && ctx.userId === userId) {
        ctx.transport.close();
        this.transports.delete(transportId);
      }
    }

    // Producers and consumers are cleaned up via transport close events
    this.logger.log(`Cleaned up media resources for user ${userId} in room ${roomId}`);
  }

  /**
   * Cleans up all media resources for a room.
   */
  async cleanupRoom(roomId: string): Promise<void> {
    // Close all transports in this room
    for (const [transportId, ctx] of this.transports.entries()) {
      if (ctx.roomId === roomId) {
        ctx.transport.close();
        this.transports.delete(transportId);
      }
    }

    // Close the router
    const router = this.routers.get(roomId);
    if (router && !router.closed) {
      router.close();
    }
    this.routers.delete(roomId);

    this.logger.log(`Cleaned up all media resources for room ${roomId}`);
  }

  /**
   * Gets all producer IDs for a room, optionally excluding a specific user.
   */
  getProducersForRoom(roomId: string, excludeUserId?: string): Array<{ producerId: string; userId: string; kind: MediaKind }> {
    const results: Array<{ producerId: string; userId: string; kind: MediaKind }> = [];

    for (const [, ctx] of this.producers.entries()) {
      if (ctx.roomId === roomId && (!excludeUserId || ctx.userId !== excludeUserId)) {
        results.push({
          producerId: ctx.producer.id,
          userId: ctx.userId,
          kind: ctx.producer.kind,
        });
      }
    }

    return results;
  }

  // ─── Private ────────────────────────────────────────────────────

  private getNextWorker(): Worker {
    if (this.workers.length === 0) {
      throw new WsMediaException('No mediasoup workers available');
    }
    const worker = this.workers[this.nextWorkerIndex];
    this.nextWorkerIndex = (this.nextWorkerIndex + 1) % this.workers.length;
    return worker;
  }
}
