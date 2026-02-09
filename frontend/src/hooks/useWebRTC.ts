import { useRef, useCallback } from 'react';
import { Device, type types as mediasoupTypes } from 'mediasoup-client';
import { useParticipantsStore } from '../store/participants.store';
import type { useSignaling } from './useSignaling';

type Signaling = ReturnType<typeof useSignaling>;

/**
 * Manages the mediasoup Device, send/recv transports, producers, and consumers.
 * This is the SFU-friendly WebRTC abstraction — no direct peer connections.
 */
export function useWebRTC(signaling: Signaling) {
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<mediasoupTypes.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupTypes.Transport | null>(null);

  /** producerKind → Producer (audio, video, screen) */
  const producersRef = useRef<Map<string, mediasoupTypes.Producer>>(new Map());

  const roomIdRef = useRef<string | null>(null);

  const {
    setParticipantAudioTrack,
    setParticipantVideoTrack,
    addConsumer,
  } = useParticipantsStore.getState();

  // ─── Initialize Device ────────────────────────────────────────

  const loadDevice = useCallback(async (rtpCapabilities: mediasoupTypes.RtpCapabilities): Promise<Device> => {
    if (deviceRef.current?.loaded) return deviceRef.current;

    const device = new Device();
    await device.load({ routerRtpCapabilities: rtpCapabilities });
    deviceRef.current = device;
    return device;
  }, []);

  // ─── Create Send Transport ────────────────────────────────────

  const createSendTransport = useCallback(async (roomId: string): Promise<mediasoupTypes.Transport> => {
    if (sendTransportRef.current && !sendTransportRef.current.closed) {
      return sendTransportRef.current;
    }

    const device = deviceRef.current;
    if (!device) throw new Error('Device not loaded');

    const transportData = await signaling.createTransport(roomId, 'send');

    const transport = device.createSendTransport({
      id: transportData.id,
      iceParameters: transportData.iceParameters,
      iceCandidates: transportData.iceCandidates,
      dtlsParameters: transportData.dtlsParameters,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      signaling.connectTransport(transport.id, dtlsParameters)
        .then(callback)
        .catch(errback);
    });

    transport.on('produce', (parameters, callback, errback) => {
      signaling.produce({
        roomId,
        transportId: transport.id,
        kind: parameters.kind,
        rtpParameters: parameters.rtpParameters,
        appData: parameters.appData as Record<string, unknown>,
      })
        .then(({ producerId }) => callback({ id: producerId }))
        .catch(errback);
    });

    transport.on('connectionstatechange', (state: string) => {
      if (state === 'failed') {
        console.error('Send transport connection failed');
        transport.close();
      }
    });

    sendTransportRef.current = transport;
    roomIdRef.current = roomId;
    return transport;
  }, [signaling]);

  // ─── Create Recv Transport ────────────────────────────────────

  const createRecvTransport = useCallback(async (roomId: string): Promise<mediasoupTypes.Transport> => {
    if (recvTransportRef.current && !recvTransportRef.current.closed) {
      return recvTransportRef.current;
    }

    const device = deviceRef.current;
    if (!device) throw new Error('Device not loaded');

    const transportData = await signaling.createTransport(roomId, 'recv');

    const transport = device.createRecvTransport({
      id: transportData.id,
      iceParameters: transportData.iceParameters,
      iceCandidates: transportData.iceCandidates,
      dtlsParameters: transportData.dtlsParameters,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    transport.on('connect', ({ dtlsParameters }, callback, errback) => {
      signaling.connectTransport(transport.id, dtlsParameters)
        .then(callback)
        .catch(errback);
    });

    transport.on('connectionstatechange', (state: string) => {
      if (state === 'failed') {
        console.error('Recv transport connection failed');
        transport.close();
      }
    });

    recvTransportRef.current = transport;
    return transport;
  }, [signaling]);

  // ─── Produce (publish a track) ────────────────────────────────

  const produceTrack = useCallback(async (
    track: MediaStreamTrack,
    appData?: Record<string, unknown>,
  ): Promise<mediasoupTypes.Producer> => {
    const transport = sendTransportRef.current;
    if (!transport || transport.closed) {
      throw new Error('Send transport not available');
    }

    const producer = await transport.produce({
      track,
      appData,
      // Encoding hints for SFU
      ...(track.kind === 'video' && {
        encodings: [
          { maxBitrate: 500_000, scaleResolutionDownBy: 2 },
          { maxBitrate: 1_500_000 },
        ],
        codecOptions: {
          videoGoogleStartBitrate: 1000,
        },
      }),
    });

    const label = (appData?.['label'] as string | undefined) ?? track.kind;
    producersRef.current.set(label, producer);

    producer.on('@close', () => {
      producersRef.current.delete(label);
    });

    return producer;
  }, []);

  // ─── Consume (subscribe to a remote producer) ─────────────────

  const consumeProducer = useCallback(async (
    roomId: string,
    producerId: string,
    userId: string,
  ): Promise<mediasoupTypes.Consumer | null> => {
    const device = deviceRef.current;
    if (!device) return null;

    const recvTransport = recvTransportRef.current;
    if (!recvTransport || recvTransport.closed) return null;

    try {
      const data = await signaling.consume({
        roomId,
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      });

      const consumer = await recvTransport.consume({
        id: data.consumerId,
        producerId: data.producerId,
        kind: data.kind,
        rtpParameters: data.rtpParameters,
      });

      // Attach track to participant in store
      if (data.kind === 'audio') {
        setParticipantAudioTrack(userId, consumer.track);
      } else {
        setParticipantVideoTrack(userId, consumer.track);
      }

      // Track consumer in store for cleanup
      addConsumer(userId, data.consumerId, consumer);

      // Resume (consumers start paused on server)
      await signaling.resumeConsumer(data.consumerId);

      return consumer;
    } catch (err) {
      console.error(`Failed to consume producer ${producerId}:`, err);
      return null;
    }
  }, [signaling, setParticipantAudioTrack, setParticipantVideoTrack, addConsumer]);

  // ─── Close a specific producer ────────────────────────────────

  const closeProducer = useCallback(async (label: string): Promise<void> => {
    const producer = producersRef.current.get(label);
    if (!producer) return;

    const roomId = roomIdRef.current;
    if (roomId) {
      await signaling.closeProducer(roomId, producer.id);
    }
    if (!producer.closed) {
      producer.close();
    }
    producersRef.current.delete(label);
  }, [signaling]);

  // ─── Pause / Resume producer ──────────────────────────────────

  const pauseProducer = useCallback(async (label: string): Promise<void> => {
    const producer = producersRef.current.get(label);
    if (!producer || producer.paused) return;
    producer.pause();
    await signaling.pauseProducer(producer.id);
  }, [signaling]);

  const resumeProducer = useCallback(async (label: string): Promise<void> => {
    const producer = producersRef.current.get(label);
    if (!producer || !producer.paused) return;
    producer.resume();
    await signaling.resumeProducer(producer.id);
  }, [signaling]);

  // ─── Replace track on a producer (device switch) ──────────────

  const replaceProducerTrack = useCallback(async (label: string, newTrack: MediaStreamTrack): Promise<void> => {
    const producer = producersRef.current.get(label);
    if (!producer || producer.closed) return;
    await producer.replaceTrack({ track: newTrack });
  }, []);

  // ─── Cleanup everything ───────────────────────────────────────

  const cleanup = useCallback(() => {
    for (const producer of producersRef.current.values()) {
      if (!producer.closed) producer.close();
    }
    producersRef.current.clear();

    if (sendTransportRef.current && !sendTransportRef.current.closed) {
      sendTransportRef.current.close();
    }
    sendTransportRef.current = null;

    if (recvTransportRef.current && !recvTransportRef.current.closed) {
      recvTransportRef.current.close();
    }
    recvTransportRef.current = null;

    deviceRef.current = null;
    roomIdRef.current = null;
  }, []);

  return {
    deviceRef,
    sendTransportRef,
    recvTransportRef,
    producersRef,
    loadDevice,
    createSendTransport,
    createRecvTransport,
    produceTrack,
    consumeProducer,
    closeProducer,
    pauseProducer,
    resumeProducer,
    replaceProducerTrack,
    cleanup,
  };
}
