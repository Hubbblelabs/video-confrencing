import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    HttpCode,
    HttpStatus,
    UsePipes,
    ValidationPipe,
    Request,
} from '@nestjs/common';
import { SubjectsService } from './subjects.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '../shared/enums';
import {
    CreateSubjectDto,
    UpdateSubjectDto,
    AssignTeacherDto,
    GrantStudentAccessDto,
} from './dto';

@Controller('admin/subjects')
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class SubjectsController {
    constructor(private readonly subjectsService: SubjectsService) { }

    // ─── SUBJECT CRUD (admin) ──────────────────────────

    @Get()
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async findAll() {
        return this.subjectsService.findAll();
    }

    @Get('my-subjects')
    @Roles(UserRole.TEACHER)
    async getMySubjects(@Request() req: any) {
        return this.subjectsService.getTeacherSubjects(req.user.id || req.user.sub);
    }

    @Get('student-subjects')
    @Roles(UserRole.STUDENT)
    async getStudentSubjects(@Request() req: any) {
        return this.subjectsService.getStudentSubjects(req.user.id || req.user.sub);
    }

    @Post()
    @Roles(UserRole.ADMIN)
    async create(@Body() dto: CreateSubjectDto) {
        return this.subjectsService.create(dto);
    }

    @Get(':id')
    @Roles(UserRole.ADMIN, UserRole.TEACHER)
    async findOne(@Param('id') id: string) {
        return this.subjectsService.findOne(id);
    }

    @Put(':id')
    @Roles(UserRole.ADMIN)
    async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
        return this.subjectsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async delete(@Param('id') id: string) {
        await this.subjectsService.delete(id);
    }

    // ─── TEACHER MAPPING (admin) ──────────────────────

    @Get(':id/teachers')
    @Roles(UserRole.ADMIN)
    async getSubjectTeachers(@Param('id') id: string) {
        return this.subjectsService.getSubjectTeachers(id);
    }

    @Post(':id/teachers')
    @Roles(UserRole.ADMIN)
    async assignTeacher(
        @Param('id') id: string,
        @Body() dto: AssignTeacherDto,
    ) {
        return this.subjectsService.assignTeacher(id, dto.teacherId);
    }

    @Delete(':id/teachers/:teacherId')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async removeTeacher(
        @Param('id') id: string,
        @Param('teacherId') teacherId: string,
    ) {
        await this.subjectsService.removeTeacher(id, teacherId);
    }

    // ─── STUDENT ACCESS (admin) ──────────────────────

    @Get(':id/students')
    @Roles(UserRole.ADMIN)
    async getSubjectStudents(@Param('id') id: string) {
        return this.subjectsService.getSubjectStudents(id);
    }

    @Post(':id/students')
    @Roles(UserRole.ADMIN)
    async grantStudentAccess(
        @Param('id') id: string,
        @Body() dto: GrantStudentAccessDto,
    ) {
        return this.subjectsService.grantStudentAccess(id, dto.studentId);
    }

    @Delete(':id/students/:studentId')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeStudentAccess(
        @Param('id') id: string,
        @Param('studentId') studentId: string,
    ) {
        await this.subjectsService.revokeStudentAccess(id, studentId);
    }
}
