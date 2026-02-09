import { Controller, Get } from '@nestjs/common';
import { RedisService } from './redis/redis.service';

interface HealthStatus {
  status: string;
  timestamp: string;
  uptime: number;
  redis: string;
}

@Controller('health')
export class HealthController {
  constructor(private readonly redis: RedisService) {}

  @Get()
  async check(): Promise<HealthStatus> {
    let redisStatus = 'down';
    try {
      await this.redis.set('health:ping', 'pong', 10);
      const pong = await this.redis.get('health:ping');
      if (pong === 'pong') redisStatus = 'up';
    } catch {
      redisStatus = 'down';
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      redis: redisStatus,
    };
  }
}
