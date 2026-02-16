import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SessionsService } from './sessions.service';
import { SessionsController } from './sessions.controller';
import { MeetingEntity, UserEntity } from '../database/entities';

@Module({
    imports: [TypeOrmModule.forFeature([MeetingEntity, UserEntity])],
    controllers: [SessionsController],
    providers: [SessionsService],
    exports: [SessionsService],
})
export class SessionsModule { }
