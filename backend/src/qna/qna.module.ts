import { Module } from '@nestjs/common';
import { QnaService } from './qna.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [QnaService],
    exports: [QnaService],
})
export class QnaModule { }
