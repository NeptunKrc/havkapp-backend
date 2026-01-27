import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { Role } from './role.entity';

@Entity('role_permissions')
@Unique(['roleId', 'permissionCode'])
@Index(['roleId'])
export class RolePermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'role_id', type: 'uuid' })
    roleId: string;

    @ManyToOne(() => Role, (role) => role.permissions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ name: 'permission_code', length: 50 })
    permissionCode: string;
}
