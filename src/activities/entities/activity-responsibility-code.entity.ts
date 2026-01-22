import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';

import { Activity } from './activity.entity';
import { responsibility_code_type_enum } from './responsibility-code.enums';

@Entity('activity_responsibility_codes')
@Index(['activity_id', 'type'], { unique: true })
@Index(['activity_id', 'code'], { unique: true })
export class ActivityResponsibilityCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // -------- RELATION --------
  @ManyToOne(() => Activity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ type: 'uuid' })
  activity_id: string;

  // -------- CODE --------
  // 4 charlı geçici sorumlu kodu
  @Column({ type: 'char', length: 4 })
  code: string;

  @Column({
    type: 'enum',
    enum: responsibility_code_type_enum,
  })
  type: responsibility_code_type_enum;

  // -------- META --------
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
