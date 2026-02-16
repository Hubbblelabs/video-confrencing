import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage, User } from '@prisma/client'; // Assuming types are generated
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
    private readonly logger = new Logger(ChatService.name);

    constructor(private readonly prisma: PrismaService) { }

    async saveMessage(data: {
        roomId: string;
        userId: string;
        content?: string;
        type?: string;
        targetUserId?: string;
        fileUrl?: string;
        fileName?: string;
        fileSize?: number;
        fileType?: string;
    }) {
        return this.prisma.chatMessage.create({
            data: {
                roomId: data.roomId,
                userId: data.userId,
                content: data.content,
                type: data.type || 'text',
                targetUserId: data.targetUserId,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                fileType: data.fileType,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        profilePictureUrl: true,
                    },
                },
            },
        });
    }

    async getMessages(roomId: string, limit = 50, offset = 0) {
        const messages = await this.prisma.chatMessage.findMany({
            where: {
                roomId,
                isDeleted: false,
            },
            orderBy: {
                createdAt: 'asc', // Chat usually loads oldest first or we fetch latest and reverse
            },
            // For chat, we usually want the last N messages.
            // But standard pagination usually does limit/offset.
            // Let's just fetch the last 100 max for now or use take/skip.
            take: limit,
            skip: offset,
            include: {
                user: {
                    select: {
                        id: true,
                        displayName: true,
                        email: true,
                        profilePictureUrl: true,
                    },
                },
            },
        });
        return messages;
    }

    async deleteMessage(messageId: string) {
        return this.prisma.chatMessage.update({
            where: { id: messageId },
            data: { isDeleted: true },
        });
    }
}
