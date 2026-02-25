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
        url: config.get<string>('postgres.url'),
        entities: [UserEntity, MeetingEntity, AuditLogEntity, WalletEntity, TransactionEntity, RoomParticipantEntity],
        autoLoadEntities: true,
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
        ssl: { rejectUnauthorized: false },
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
