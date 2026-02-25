import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env['NODE_ENV'] || 'development',
  port: parseInt(process.env['PORT'] || '3000', 10),
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env['JWT_SECRET'] || 'change-me',
  expiration: parseInt(process.env['JWT_EXPIRATION'] || '3600', 10),
}));

export const postgresConfig = registerAs('postgres', () => ({
  url: process.env['DATABASE_URL'],
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env['REDIS_HOST'] || 'localhost',
  port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
  password: process.env['REDIS_PASSWORD'] || undefined,
}));

export const mediasoupConfig = registerAs('mediasoup', () => ({
  listenIp: process.env['MEDIASOUP_LISTEN_IP'] || '0.0.0.0',
  announcedIp: process.env['MEDIASOUP_ANNOUNCED_IP'] || '127.0.0.1',
  minPort: parseInt(process.env['MEDIASOUP_MIN_PORT'] || '40000', 10),
  maxPort: parseInt(process.env['MEDIASOUP_MAX_PORT'] || '49999', 10),
  numWorkers: parseInt(process.env['MEDIASOUP_NUM_WORKERS'] || '2', 10),
  logLevel: (process.env['MEDIASOUP_LOG_LEVEL'] as 'debug' | 'warn' | 'error' | 'none') || 'warn',
  mediaCodecs: [
    {
      kind: 'audio' as const,
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video' as const,
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
    {
      kind: 'video' as const,
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
        'x-google-start-bitrate': 1000,
      },
    },
  ],
}));

export const roomConfig = registerAs('room', () => ({
  maxParticipants: parseInt(process.env['MAX_PARTICIPANTS_PER_ROOM'] || '100', 10),
}));

export const throttleConfig = registerAs('throttle', () => ({
  ttl: parseInt(process.env['THROTTLE_TTL'] || '60', 10),
  limit: parseInt(process.env['THROTTLE_LIMIT'] || '60', 10),
}));
