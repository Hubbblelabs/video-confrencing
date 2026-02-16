import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingEntity, UserEntity, RoomParticipantEntity } from '../database/entities';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingEntity, UserEntity, RoomParticipantEntity]),
    BillingModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule { }
