import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum ParticipantRole {
  HOST = 'HOST',
  CO_HOST = 'CO_HOST',
  PARTICIPANT = 'PARTICIPANT',
}

@Entity('room_participants')
@Index(['userId', 'roomId', 'joinedAt'], { unique: true })
@Index(['userId'])
@Index(['roomId'])
@Index(['roomId', 'leftAt'])
@Index(['userId', 'leftAt'])
@Index(['roomId', 'role'])
export class RoomParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  roomId!: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: ParticipantRole.PARTICIPANT,
  })
  role!: ParticipantRole;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  leftAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  isKicked!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  kickedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  kickedBy!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  kickReason!: string | null;

  @Column({ type: 'boolean', default: false })
  isBanned!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  bannedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  bannedBy!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  banReason!: string | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds!: number | null;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;
}
