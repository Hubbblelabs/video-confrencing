import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingEntity, UserEntity, RoomParticipantEntity } from '../database/entities';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingEntity, UserEntity, RoomParticipantEntity])],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
