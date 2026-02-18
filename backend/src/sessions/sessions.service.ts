import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { MeetingEntity, UserEntity } from '../database/entities';
import { RoomStatus } from '../shared/enums';

@Injectable()
export class SessionsService {
    constructor(
        @InjectRepository(MeetingEntity)
        private readonly meetingRepo: Repository<MeetingEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
    ) { }

    async findAll(filters: {
        query?: string;
        teacherId?: string;
        category?: string;
        startDate?: Date;
        endDate?: Date;
        minPrice?: number;
        maxPrice?: number;
        sortBy?: 'date' | 'price' | 'popularity';
        order?: 'ASC' | 'DESC';
        limit?: number;
        offset?: number;
    }) {
        const qb = this.meetingRepo.createQueryBuilder('session')
            .leftJoinAndSelect('session.host', 'host')
            .where('session.status IN (:...statuses)', {
                statuses: [RoomStatus.WAITING, RoomStatus.ACTIVE, RoomStatus.SCHEDULED]
            });

        if (filters.query) {
            qb.andWhere('(session.title ILIKE :query OR session.description ILIKE :query OR session.tags ILIKE :query)', {
                query: `%${filters.query}%`
            });
        }

        if (filters.teacherId) {
            qb.andWhere('session.hostId = :teacherId', { teacherId: filters.teacherId });
        }

        if (filters.category) {
            qb.andWhere('session.category = :category', { category: filters.category });
        }

        if (filters.minPrice !== undefined) {
            qb.andWhere('session.price >= :minPrice', { minPrice: filters.minPrice });
        }

        if (filters.maxPrice !== undefined) {
            qb.andWhere('session.price <= :maxPrice', { maxPrice: filters.maxPrice });
        }

        if (filters.startDate) {
            qb.andWhere('COALESCE(session.scheduledStart, session.createdAt) >= :startDate', { startDate: filters.startDate });
        }

        if (filters.endDate) {
            qb.andWhere('COALESCE(session.scheduledStart, session.createdAt) <= :endDate', { endDate: filters.endDate });
        }

        // Sorting
        const sort = filters.sortBy || 'date';
        const order = filters.order || 'DESC';

        if (sort === 'date') {
            qb.orderBy('session.createdAt', order);
        } else if (sort === 'price') {
            qb.orderBy('session.price', order);
        } else if (sort === 'popularity') {
            qb.orderBy('session.peakParticipants', order);
        }

        const [sessions, total] = await qb
            .skip(filters.offset || 0)
            .take(filters.limit || 20)
            .getManyAndCount();

        return { sessions, total };
    }

    async findOne(id: string) {
        const session = await this.meetingRepo.findOne({
            where: { id },
            relations: ['host'],
        });

        if (!session) {
            throw new NotFoundException('Session not found');
        }

        return session;
    }

    async findTeacherProfile(id: string) {
        const teacher = await this.userRepo.findOne({
            where: { id },
        });

        if (!teacher) {
            throw new NotFoundException('Teacher not found');
        }

        return teacher;
    }
}
