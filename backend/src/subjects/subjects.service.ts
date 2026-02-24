import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubjectDto, UpdateSubjectDto } from './dto';

@Injectable()
export class SubjectsService {
    private readonly logger = new Logger(SubjectsService.name);

    constructor(private readonly prisma: PrismaService) { }

    // ─── SUBJECT CRUD ──────────────────────────────────

    async create(dto: CreateSubjectDto) {
        try {
            const subject = await this.prisma.subject.create({
                data: {
                    name: dto.name,
                    description: dto.description,
                    icon: dto.icon,
                    color: dto.color,
                },
            });
            this.logger.log(`Subject created: ${subject.id} (${subject.name})`);
            return subject;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException(`Subject "${dto.name}" already exists`);
            }
            throw error;
        }
    }

    async findAll() {
        return this.prisma.subject.findMany({
            include: {
                teachers: {
                    include: {
                        teacher: {
                            select: { id: true, displayName: true, email: true },
                        },
                    },
                },
                students: {
                    include: {
                        student: {
                            select: { id: true, displayName: true, email: true },
                        },
                    },
                },
                _count: {
                    select: { teachers: true, students: true },
                },
            },
            orderBy: { name: 'asc' },
        });
    }

    async findOne(id: string) {
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                teachers: {
                    include: {
                        teacher: {
                            select: { id: true, displayName: true, email: true },
                        },
                    },
                },
                students: {
                    include: {
                        student: {
                            select: { id: true, displayName: true, email: true },
                        },
                    },
                },
            },
        });

        if (!subject) {
            throw new NotFoundException(`Subject with ID ${id} not found`);
        }

        return subject;
    }

    async update(id: string, dto: UpdateSubjectDto) {
        await this.findOne(id);

        try {
            const updated = await this.prisma.subject.update({
                where: { id },
                data: dto,
            });
            this.logger.log(`Subject updated: ${updated.id}`);
            return updated;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException(`Subject "${dto.name}" already exists`);
            }
            throw error;
        }
    }

    async delete(id: string) {
        await this.findOne(id);

        await this.prisma.subject.delete({ where: { id } });
        this.logger.log(`Subject deleted: ${id}`);
    }

    // ─── TEACHER MAPPING ──────────────────────────────

    async getSubjectTeachers(subjectId: string) {
        await this.findOne(subjectId);

        return this.prisma.teacherSubject.findMany({
            where: { subjectId },
            include: {
                teacher: {
                    select: { id: true, displayName: true, email: true },
                },
            },
        });
    }

    async assignTeacher(subjectId: string, teacherId: string) {
        await this.findOne(subjectId);

        // Verify the user exists and is a teacher
        const user = await this.prisma.user.findUnique({
            where: { id: teacherId },
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${teacherId} not found`);
        }
        if (user.role !== 'TEACHER') {
            throw new BadRequestException('User is not a teacher');
        }

        try {
            const assignment = await this.prisma.teacherSubject.create({
                data: { teacherId, subjectId },
                include: {
                    teacher: {
                        select: { id: true, displayName: true, email: true },
                    },
                    subject: true,
                },
            });
            this.logger.log(`Teacher ${teacherId} assigned to subject ${subjectId}`);
            return assignment;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException('Teacher is already assigned to this subject');
            }
            throw error;
        }
    }

    async removeTeacher(subjectId: string, teacherId: string) {
        const assignment = await this.prisma.teacherSubject.findUnique({
            where: { teacherId_subjectId: { teacherId, subjectId } },
        });

        if (!assignment) {
            throw new NotFoundException('Teacher is not assigned to this subject');
        }

        await this.prisma.teacherSubject.delete({
            where: { id: assignment.id },
        });
        this.logger.log(`Teacher ${teacherId} removed from subject ${subjectId}`);
    }

    async getTeacherSubjects(teacherId: string) {
        return this.prisma.teacherSubject.findMany({
            where: { teacherId },
            include: {
                subject: true,
            },
        });
    }

    // ─── STUDENT ACCESS ──────────────────────────────

    async getSubjectStudents(subjectId: string) {
        await this.findOne(subjectId);

        return this.prisma.studentSubjectAccess.findMany({
            where: { subjectId },
            include: {
                student: {
                    select: { id: true, displayName: true, email: true },
                },
            },
        });
    }

    async grantStudentAccess(subjectId: string, studentId: string) {
        await this.findOne(subjectId);

        // Verify the user exists and is a student
        const user = await this.prisma.user.findUnique({
            where: { id: studentId },
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${studentId} not found`);
        }
        if (user.role !== 'STUDENT') {
            throw new BadRequestException('User is not a student');
        }

        try {
            const access = await this.prisma.studentSubjectAccess.create({
                data: { studentId, subjectId },
                include: {
                    student: {
                        select: { id: true, displayName: true, email: true },
                    },
                    subject: true,
                },
            });
            this.logger.log(`Student ${studentId} granted access to subject ${subjectId}`);
            return access;
        } catch (error: any) {
            if (error.code === 'P2002') {
                throw new ConflictException('Student already has access to this subject');
            }
            throw error;
        }
    }

    async revokeStudentAccess(subjectId: string, studentId: string) {
        const access = await this.prisma.studentSubjectAccess.findUnique({
            where: { studentId_subjectId: { studentId, subjectId } },
        });

        if (!access) {
            throw new NotFoundException('Student does not have access to this subject');
        }

        await this.prisma.studentSubjectAccess.delete({
            where: { id: access.id },
        });
        this.logger.log(`Student ${studentId} access revoked from subject ${subjectId}`);
    }

    async getStudentSubjects(studentId: string) {
        return this.prisma.studentSubjectAccess.findMany({
            where: { studentId },
            include: {
                subject: true,
            },
        });
    }
}
