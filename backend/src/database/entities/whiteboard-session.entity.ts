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
import { MeetingEntity } from './meeting.entity';

@Entity('whiteboard_sessions')
export class WhiteboardSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  meetingId!: string;

  @Column({ type: 'uuid' })
  @Index()
  hostId!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  title!: string | null;

  @Column({ type: 'int', default: 1 })
  slideCount!: number;

  /**
   * Array of slide objects: [{ slideIndex, elements, thumbnailDataUrl }]
   * Elements are raw Excalidraw element arrays per slide.
   */
  @Column({ type: 'jsonb', default: '[]' })
  slidesData!: Array<{
    slideIndex: number;
    elements: any[];
    thumbnailDataUrl: string | null;
  }>;

  /**
   * PDF binary stored as base64 text for portability.
   * Encoded/decoded by the service layer.
   */
  @Column({ type: 'text', nullable: true })
  pdfBase64!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => MeetingEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'meetingId' })
  meeting!: MeetingEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host!: UserEntity;
}
