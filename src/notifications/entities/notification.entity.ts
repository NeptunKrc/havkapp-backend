import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationTemplate } from './notification-template.entity';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => NotificationTemplate, { nullable: false })
  @JoinColumn({ name: 'template_id' })
  template: NotificationTemplate;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    name: 'created_by_user_id',
    type: 'uuid',
    nullable: true,
  })
  createdByUserId: string | null;

  @Column({
    name: 'related_entity_type',
    length: 100,
  })
  relatedEntityType: string;

  @Column({
    name: 'related_entity_id',
    type: 'uuid',
  })
  relatedEntityId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
