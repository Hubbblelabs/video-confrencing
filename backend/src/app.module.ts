import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  appConfig,
  jwtConfig,
  postgresConfig,
  redisConfig,
  mediasoupConfig,
  roomConfig,
  throttleConfig,
} from './config';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { RoomsModule } from './rooms/rooms.module';
import { MediaModule } from './media/media.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { GatewayModule } from './gateway/gateway.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, postgresConfig, redisConfig, mediasoupConfig, roomConfig, throttleConfig],
      envFilePath: '.env',
    }),

    // Infrastructure
    DatabaseModule, // Old TypeORM (to be migrated)
    PrismaModule,   // New Prisma ORM
    RedisModule,
    AuditModule,

    // Feature modules
    AuthModule,
    RoomsModule,
    MediaModule,
    WebrtcModule,
    GatewayModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
