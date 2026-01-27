import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique, OneToMany } from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';
import { RolePermission } from './role-permission.entity';

@Entity('roles')
@Unique(['clubId', 'name'])
export class Role {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 100 })
    name: string;

    @Column({ name: 'club_id', type: 'uuid' })
    clubId: string;

    @ManyToOne(() => Club, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'club_id' })
    club: Club;

    @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
    permissions: RolePermission[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
