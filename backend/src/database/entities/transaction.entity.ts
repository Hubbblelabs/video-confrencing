import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MeetingEntity } from './meeting.entity';
import { TransactionType, TransactionStatus } from '../../shared/enums';

@Entity('transactions')
export class TransactionEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'uuid' })
    @Index()
    userId!: string;

    @Column({ type: 'uuid', nullable: true })
    @Index()
    meetingId!: string | null;

    @Column({ type: 'enum', enum: TransactionType })
    type!: TransactionType;

    @Column({ type: 'int' })
    amount!: number; // Amount in credits

    @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
    status!: TransactionStatus;

    @Column({ type: 'varchar', length: 255, nullable: true })
    providerTransactionId!: string | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata!: any;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt!: Date;

    @ManyToOne(() => UserEntity, (user) => user.transactions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user!: UserEntity;

    @ManyToOne(() => MeetingEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'meetingId' })
    meeting!: MeetingEntity | null;
}
