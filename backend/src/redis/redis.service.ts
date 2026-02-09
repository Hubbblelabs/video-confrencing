import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('redis.host', 'localhost');
    const port = this.configService.get<number>('redis.port', 6379);
    const password = this.configService.get<string>('redis.password');

    this.client = new Redis({
      host,
      port,
      password: password || undefined,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error('Redis: max retries reached, giving up');
          return null;
        }
        return Math.min(times * 200, 5000);
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    try {
      await this.client.connect();
    } catch (error) {
      this.logger.error(`Failed to connect to Redis: ${(error as Error).message}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  // ─── Hash Operations ────────────────────────────────────────────

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hmset(key: string, data: Record<string, string>): Promise<'OK'> {
    return this.client.hmset(key, data);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hlen(key: string): Promise<number> {
    return this.client.hlen(key);
  }

  // ─── String Operations ──────────────────────────────────────────

  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.client.set(key, value, 'EX', ttl);
    }
    return this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  // ─── Set Operations ─────────────────────────────────────────────

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async sismember(key: string, member: string): Promise<number> {
    return this.client.sismember(key, member);
  }

  // ─── Key Operations ─────────────────────────────────────────────

  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  // ─── Pipeline / Multi ───────────────────────────────────────────

  pipeline(): ReturnType<Redis['pipeline']> {
    return this.client.pipeline();
  }

  multi(): ReturnType<Redis['multi']> {
    return this.client.multi();
  }
}
