import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QnaService {
    private readonly logger = new Logger(QnaService.name);

    constructor(private readonly prisma: PrismaService) { }

    async askQuestion(roomId: string, userId: string, content: string) {
        return this.prisma.question.create({
            data: {
                roomId,
                userId,
                content,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePictureUrl: true,
                    },
                },
                _count: {
                    select: { upvotes: true },
                },
                upvotes: {
                    where: { userId },
                    select: { userId: true }
                }
            },
        });
    }

    async getQuestions(roomId: string, userId?: string) {
        // If userId provided, we can check if they upvoted
        const questions = await this.prisma.question.findMany({
            where: {
                roomId,
            },
            orderBy: [
                { isAnswered: 'asc' }, // Unanswered first
                { upvotes: { _count: 'desc' } }, // Most upvoted first
                { createdAt: 'desc' }, // Newest first
            ],
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        profilePictureUrl: true,
                    },
                },
                _count: {
                    select: { upvotes: true },
                },
                upvotes: userId ? {
                    where: { userId },
                    select: { userId: true }
                } : false
            },
        });

        return questions.map(q => ({
            ...q,
            isUpvoted: q.upvotes?.length > 0,
            upvoteCount: q._count.upvotes
        }));
    }

    async upvoteQuestion(questionId: string, userId: string) {
        // Toggle upvote
        const existing = await this.prisma.questionUpvote.findUnique({
            where: {
                questionId_userId: {
                    questionId,
                    userId,
                },
            },
        });

        if (existing) {
            await this.prisma.questionUpvote.delete({
                where: { id: existing.id },
            });
        } else {
            await this.prisma.questionUpvote.create({
                data: {
                    questionId,
                    userId,
                },
            });
        }

        const count = await this.prisma.questionUpvote.count({
            where: { questionId }
        });

        return { upvoted: !existing, upvotes: count };
    }


    async markAnswered(questionId: string, isAnswered: boolean) {
        return this.prisma.question.update({
            where: { id: questionId },
            data: { isAnswered },
        });
    }

    async deleteQuestion(questionId: string) {
        return this.prisma.question.delete({
            where: { id: questionId }
        });
    }
}
