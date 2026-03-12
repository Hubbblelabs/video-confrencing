import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteboardSessionEntity } from '../database/entities/whiteboard-session.entity';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardController } from './whiteboard.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WhiteboardSessionEntity])],
  controllers: [WhiteboardController],
  providers: [WhiteboardService],
  exports: [WhiteboardService],
})
export class WhiteboardModule {}
