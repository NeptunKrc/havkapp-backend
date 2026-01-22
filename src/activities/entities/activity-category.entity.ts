import { Column, Entity, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('activity_categories')
@Index(['club_id'])
@Index(['club_id', 'name'], { unique: true })
export class ActivityCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'uuid' })
  club_id: string;
}
