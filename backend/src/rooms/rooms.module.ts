import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MeetingEntity } from '../database/entities';
import { RoomsService } from './rooms.service';

@Module({
  imports: [TypeOrmModule.forFeature([MeetingEntity])],
  providers: [RoomsService],
  exports: [RoomsService],
})
export class RoomsModule {}
