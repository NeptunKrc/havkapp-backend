import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('qr_codes')
@Index(['type', 'targetId'], { unique: true })
export class QrCodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  type: string;

  @Column({ type: 'uuid', name: 'target_id' })
  targetId: string;

  @Column({ type: 'uuid', name: 'club_id' })
  clubId: string;

  @Column({
    type: 'enum',
    enum: ['active', 'revoked'],
    default: 'active',
  })
  status: 'active' | 'revoked';

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
