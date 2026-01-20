import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
} from 'typeorm';

import { obligation_type_enum, activity_status_enum } from './activity.enums';
import { ActivityCategory } from './activity-category.entity';
import { Location } from './location.entity';

@Entity('activities')
@Index(['club_id'])
@Index(['activity_date'])
@Index(['status'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({
    type: 'enum',
    enum: obligation_type_enum,
  })
  obligation_type: obligation_type_enum;

  @Column({
    type: 'enum',
    enum: activity_status_enum,
    default: activity_status_enum.upcoming,
  })
  status: activity_status_enum;

  // -------- Activity Category --------
  @ManyToOne(() => ActivityCategory, { nullable: false })
  @JoinColumn({ name: 'activity_category_id' })
  activity_category: ActivityCategory;

  @Column({ type: 'uuid' })
  activity_category_id: string;

  // -------- Location --------
  @ManyToOne(() => Location, { nullable: false })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'uuid' })
  location_id: string;

  // -------- Schedule --------
  @Column({ type: 'date' })
  activity_date: string;

  @Column({ type: 'time' })
  gathering_time: string;

  @Column({ type: 'time' })
  departure_time: string;

  // -------- Meta --------
  @Column({ type: 'boolean' })
  is_transport_required: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid' })
  created_by_user_id: string;

  @Column({ type: 'uuid' })
  club_id: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;
}
