import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    WalletEntity,
    TransactionEntity,
    UserEntity
} from '../database/entities';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            WalletEntity,
            TransactionEntity,
            UserEntity
        ]),
    ],
    controllers: [BillingController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule { }
