import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('user_permissions')
@Unique(['userId', 'permissionCode'])
@Index(['userId'])
export class UserPermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'permission_code', length: 50 })
    permissionCode: string;

    @CreateDateColumn({ name: 'granted_at' })
    grantedAt: Date;
}
