import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingEntity, UserEntity } from '../database/entities';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingEntity, UserEntity])],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
