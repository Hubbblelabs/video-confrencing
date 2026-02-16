import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { MeetingEntity } from './meeting.entity';
import { AuditLogEntity } from './audit-log.entity';
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

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => MeetingEntity, (meeting) => meeting.host)
  hostedMeetings!: MeetingEntity[];

  @OneToMany(() => AuditLogEntity, (log) => log.user)
  auditLogs!: AuditLogEntity[];
}
