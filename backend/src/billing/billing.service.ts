import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
    WalletEntity,
    TransactionEntity,
    UserEntity,
} from '../database/entities';
import { TransactionType, TransactionStatus } from '../shared/enums';

@Injectable()
export class BillingService {
    private readonly logger = new Logger(BillingService.name);

    constructor(
        @InjectRepository(WalletEntity)
        private readonly walletRepo: Repository<WalletEntity>,
        @InjectRepository(TransactionEntity)
        private readonly transactionRepo: Repository<TransactionEntity>,
        @InjectRepository(UserEntity)
        private readonly userRepo: Repository<UserEntity>,
        private readonly dataSource: DataSource,
    ) { }

    /**
     * Get or create a wallet for a user
     */
    async getOrCreateWallet(userId: string): Promise<WalletEntity> {
        let wallet = await this.walletRepo.findOne({ where: { userId } });

        if (!wallet) {
            this.logger.log(`Creating wallet for user ${userId}`);
            wallet = this.walletRepo.create({ userId, balance: 0 });
            await this.walletRepo.save(wallet);
        }

        return wallet;
    }

    /**
     * Add credits to a user's wallet (Top-up)
     */
    async addCredits(params: {
        userId: string;
        amount: number;
        providerTransactionId?: string;
        metadata?: any;
    }): Promise<TransactionEntity> {
        if (params.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        return this.dataSource.transaction(async (manager) => {
            const walletRepo = manager.getRepository(WalletEntity);
            const transactionRepo = manager.getRepository(TransactionEntity);

            const wallet = await walletRepo.findOne({
                where: { userId: params.userId },
                lock: { mode: 'pessimistic_write' }
            });

            if (!wallet) {
                throw new NotFoundException('Wallet not found');
            }

            const transaction = transactionRepo.create({
                userId: params.userId,
                type: TransactionType.TOPUP,
                amount: params.amount,
                status: TransactionStatus.SUCCESS,
                providerTransactionId: params.providerTransactionId,
                metadata: params.metadata,
            });

            wallet.balance += params.amount;

            await walletRepo.save(wallet);
            return transactionRepo.save(transaction);
        });
    }

    /**
     * Debit credits for a session
     */
    async debitCredits(params: {
        userId: string;
        amount: number;
        meetingId: string;
        metadata?: any;
    }): Promise<TransactionEntity> {
        if (params.amount <= 0) {
            throw new BadRequestException('Amount must be positive');
        }

        return this.dataSource.transaction(async (manager) => {
            const walletRepo = manager.getRepository(WalletEntity);
            const transactionRepo = manager.getRepository(TransactionEntity);

            const wallet = await walletRepo.findOne({
                where: { userId: params.userId },
                lock: { mode: 'pessimistic_write' }
            });

            if (!wallet) {
                throw new NotFoundException('Wallet not found');
            }

            if (wallet.balance < params.amount) {
                throw new BadRequestException('Insufficient credits');
            }

            const transaction = transactionRepo.create({
                userId: params.userId,
                meetingId: params.meetingId,
                type: TransactionType.DEBIT,
                amount: params.amount,
                status: TransactionStatus.SUCCESS,
                metadata: params.metadata,
            });

            wallet.balance -= params.amount;

            await walletRepo.save(wallet);
            return transactionRepo.save(transaction);
        });
    }

    async getTransactions(userId: string): Promise<TransactionEntity[]> {
        return this.transactionRepo.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            relations: ['meeting'],
        });
    }

    /**
     * Get overall stats for admins
     */
    async getAdminStats(): Promise<{
        totalCredits: number;
        totalRevenue: number;
        transactionCount: number;
        recentTransactions: TransactionEntity[];
    }> {
        const totalCredits = await this.walletRepo.sum('balance');
        const totalRevenue = await this.transactionRepo.sum('amount', {
            type: TransactionType.TOPUP,
            status: TransactionStatus.SUCCESS,
        });
        const transactionCount = await this.transactionRepo.count();
        const recentTransactions = await this.transactionRepo.find({
            order: { createdAt: 'DESC' },
            take: 10,
            relations: ['user', 'meeting'],
        });

        return {
            totalCredits: totalCredits || 0,
            totalRevenue: totalRevenue || 0,
            transactionCount,
            recentTransactions,
        };
    }
}
