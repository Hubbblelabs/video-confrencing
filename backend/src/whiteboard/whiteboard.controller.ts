import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhiteboardService, SaveWhiteboardDto } from './whiteboard.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '../shared/enums';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsUUID,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

class SlideDataDto {
  @IsInt()
  @Min(0)
  slideIndex!: number;

  @IsArray()
  elements!: any[];

  @IsOptional()
  @IsString()
  thumbnailDataUrl!: string | null;
}

class SaveWhiteboardBodyDto {
  @IsUUID()
  meetingId!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SlideDataDto)
  slidesData!: SlideDataDto[];

  @IsString()
  @IsNotEmpty()
  pdfBase64!: string;
}

@Controller('whiteboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhiteboardController {
  constructor(private readonly whiteboardService: WhiteboardService) {}

  /** Teacher saves whiteboard at end of session */
  @Post('save')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async save(@Req() req: any, @Body() body: SaveWhiteboardBodyDto) {
    return this.whiteboardService.save({
      meetingId: body.meetingId,
      hostId: req.user.id,
      title: body.title,
      slidesData: body.slidesData,
      pdfBase64: body.pdfBase64,
    });
  }

  /** Get all whiteboard sessions for a specific meeting (admin or host) */
  @Get('meeting/:meetingId')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getForMeeting(
    @Req() req: any,
    @Param('meetingId', ParseUUIDPipe) meetingId: string,
  ) {
    return this.whiteboardService.findForMeeting(
      meetingId,
      req.user.id,
      req.user.role,
    );
  }

  /** Get a single whiteboard session including PDF data (admin or host) */
  @Get(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getOne(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.whiteboardService.findOne(id, req.user.id, req.user.role);
  }

  /** Teacher dashboard: all whiteboards saved by this teacher */
  @Get('teacher/my')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  async getMyWhiteboards(@Req() req: any) {
    return this.whiteboardService.findForTeacher(req.user.id);
  }

  /** Admin: all whiteboard sessions across all meetings */
  @Get('admin/all')
  @Roles(UserRole.ADMIN)
  async getAllWhiteboards() {
    return this.whiteboardService.findAll();
  }
}
