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
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { MediaModule } from './media/media.module';
import { WebrtcModule } from './webrtc/webrtc.module';
import { GatewayModule } from './gateway/gateway.module';
import { AttendanceModule } from './attendance/attendance.module';
import { BillingModule } from './billing/billing.module';
import { SessionsModule } from './sessions/sessions.module';
import { HealthController } from './health.controller';
import { ChatModule } from './chat/chat.module';
import { QnaModule } from './qna/qna.module';
import { SubjectsModule } from './subjects/subjects.module';

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
    UsersModule,
    RoomsModule,
    MediaModule,
    WebrtcModule,
    GatewayModule,
    AttendanceModule,
    BillingModule,
    SessionsModule,
    ChatModule,
    QnaModule,
    SubjectsModule,
  ],
  controllers: [HealthController],
})
export class AppModule { }
