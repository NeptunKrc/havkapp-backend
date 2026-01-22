import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Örn: ACTIVITY_CREATED
   */
  @Column({ unique: true })
  code: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /**
   * Opsiyonel gruplama (örn: activity)
   */
  @Column({ length: 100 })
  category: string;
}
