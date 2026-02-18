import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Param,
    UseGuards,
    ParseIntPipe,
    Req,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '../shared/enums';
import { ScheduleMeetingDto } from './dto/room.dto';

@Controller('admin/meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
    constructor(private readonly roomsService: RoomsService) { }

    @Get('history')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async getHistory(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    ) {
        return this.roomsService.getMeetingHistory({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            limit,
            offset,
            hostUserId: req.user.role === UserRole.TEACHER ? req.user.id : undefined,
        });
    }

    @Get('schedule')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async getSchedule(
        @Req() req: any,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.roomsService.getMeetingSchedule({
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            hostUserId: req.user.role === UserRole.TEACHER ? req.user.id : undefined,
        });
    }

    @Post('schedule')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async scheduleMeeting(@Req() req: any, @Body() dto: ScheduleMeetingDto) {
        return this.roomsService.scheduleMeeting({
            hostUserId: req.user.id,
            title: dto.title,
            scheduledStart: new Date(dto.scheduledStart),
            scheduledEnd: new Date(dto.scheduledEnd),
            maxParticipants: dto.maxParticipants,
        });
    }

    @Post('create')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async createInstantMeeting(@Req() req: any) {
        return this.roomsService.createRoom({
            hostUserId: req.user.id,
            title: 'Instant Meeting',
            maxParticipants: 100,
        });
    }

    @Post(':id/start')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async startMeeting(@Req() req: any, @Param('id') id: string) {
        return this.roomsService.startScheduledMeeting(id, req.user.id);
    }

    @Get('upcoming')
    async getUpcoming() {
        return this.roomsService.getMeetingSchedule({
            startDate: new Date(),
        });
    }
}
