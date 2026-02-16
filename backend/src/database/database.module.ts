import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity, MeetingEntity, AuditLogEntity, WalletEntity, TransactionEntity, RoomParticipantEntity } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('postgres.host'),
        port: config.get<number>('postgres.port'),
        username: config.get<string>('postgres.username'),
        password: config.get<string>('postgres.password'),
        database: config.get<string>('postgres.database'),
        entities: [UserEntity, MeetingEntity, AuditLogEntity, WalletEntity, TransactionEntity, RoomParticipantEntity],
        autoLoadEntities: true,
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
        ssl: config.get<string>('app.nodeEnv') === 'production' ? { rejectUnauthorized: false } : false,
        extra: {
          max: 20,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
    TypeOrmModule.forFeature([UserEntity, MeetingEntity, AuditLogEntity, WalletEntity, TransactionEntity, RoomParticipantEntity]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule { }
