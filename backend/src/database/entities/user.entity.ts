import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { MeetingEntity } from './meeting.entity';
import { AuditLogEntity } from './audit-log.entity';
import { WalletEntity } from './wallet.entity';
import { TransactionEntity } from './transaction.entity';
import { UserRole } from '../../shared/enums';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email!: string;

  @Column({ type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.STUDENT
  })
  role!: UserRole;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  bio!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  profilePictureUrl!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  specialties!: string[] | null;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  verificationToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verificationTokenExpires!: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetToken!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  resetTokenExpires!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.host)
  hostedMeetings!: MeetingEntity[];

  @OneToMany(() => AuditLogEntity, (log) => log.user)
  auditLogs!: AuditLogEntity[];

  @OneToOne(() => WalletEntity, (wallet) => wallet.user)
  wallet!: WalletEntity;

  @OneToMany(() => TransactionEntity, (transaction) => transaction.user)
  transactions!: TransactionEntity[];
}
