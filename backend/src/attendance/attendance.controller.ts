import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ValidationPipe,
  ParseIntPipe,
  Optional,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '../shared/enums';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.TEACHER)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  /**
   * GET /attendance
   * Get all attendance records with optional filters
   */
  @Get()
  async getAttendanceRecords(
    @Query('userId') userId?: string,
    @Query('roomId') roomId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('role') role?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const filters: any = {};

    if (userId) filters.userId = userId;
    if (roomId) filters.roomId = roomId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (role) filters.role = role;
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    return this.attendanceService.getAttendanceRecords(filters);
  }

  /**
   * GET /attendance/statistics
   * Get attendance statistics
   */
  @Get('statistics')
  async getStatistics(
    @Query('userId') userId?: string,
    @Query('roomId') roomId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};

    if (userId) filters.userId = userId;
    if (roomId) filters.roomId = roomId;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.attendanceService.getAttendanceStatistics(filters);
  }

  /**
   * GET /attendance/summary
   * Get attendance summary by user
   */
  @Get('summary')
  async getUserSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    const filters: any = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    return this.attendanceService.getUserAttendanceSummary(filters);
  }

  /**
   * GET /attendance/active
   * Get currently active sessions
   */
  @Get('active')
  async getActiveSessions() {
    return this.attendanceService.getActiveSessions();
  }

  /**
   * GET /attendance/room/:roomId
   * Get attendance for a specific room
   */
  @Get('room/:roomId')
  async getAttendanceByRoom(@Param('roomId', ParseUUIDPipe) roomId: string) {
    return this.attendanceService.getAttendanceByRoom(roomId);
  }
}
