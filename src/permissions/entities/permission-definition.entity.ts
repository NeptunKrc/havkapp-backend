import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('permission_definitions')
export class PermissionDefinition {
    @PrimaryColumn({ length: 100 })
    key: string; // e.g., 'activity:create'

    @Column({ name: 'group_name', length: 100 })
    groupName: string; // e.g., 'Activity Management'

    @Column({ name: 'display_name', length: 100 })
    displayName: string; // e.g., 'Create Activity'

    @Column({ type: 'text', nullable: true })
    description: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
