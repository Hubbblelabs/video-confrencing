import { Controller, Get, Query, Param, ParseUUIDPipe, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) { }

    @Get()
    async getSessions(
        @Query('q') query?: string,
        @Query('teacherId') teacherId?: string,
        @Query('category') category?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('minPrice', new ParseIntPipe({ optional: true })) minPrice?: number,
        @Query('maxPrice', new ParseIntPipe({ optional: true })) maxPrice?: number,
        @Query('sortBy') sortBy?: 'date' | 'price' | 'popularity',
        @Query('order') order?: 'ASC' | 'DESC',
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
        @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
    ) {
        return this.sessionsService.findAll({
            query,
            teacherId,
            category,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            minPrice,
            maxPrice,
            sortBy,
            order,
            limit,
            offset,
        });
    }

    @Get(':id')
    async getSession(@Param('id', ParseUUIDPipe) id: string) {
        return this.sessionsService.findOne(id);
    }

    @Get('teacher/:id')
    async getTeacher(@Param('id', ParseUUIDPipe) id: string) {
        return this.sessionsService.findTeacherProfile(id);
    }
}
