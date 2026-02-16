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
import { RoomStatus } from '../../shared/enums';

@Entity('meetings')
export class MeetingEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  @Index()
  roomCode!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int', default: 0 })
  price!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl!: string | null;

  @Column({ type: 'simple-array', nullable: true })
  tags!: string[] | null;

  @Column({ type: 'uuid' })
  @Index()
  hostId!: string;

  @ManyToOne(() => UserEntity, (user) => user.hostedMeetings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host!: UserEntity;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.WAITING })
  status!: RoomStatus;

  @Column({ type: 'int', default: 100 })
  maxParticipants!: number;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledStart!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  scheduledEnd!: Date | null;

  @Column({ type: 'int', default: 0 })
  peakParticipants!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
