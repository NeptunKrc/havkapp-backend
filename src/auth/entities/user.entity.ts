import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Club } from '../../clubs/entities/club.entity';
import { UserRole } from '../../permissions/entities/user-role.entity';

export enum MembershipStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('users')
@Index(['studentNo'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'student_no', unique: true, length: 20 })
  studentNo: string;

  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @Column({ name: 'email', unique: true, length: 255 })
  email: string;

  @Column({ name: 'club_id', type: 'uuid' })
  clubId: string;

  @ManyToOne(() => Club, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'club_id' })
  club: Club;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  roles: UserRole[];

  @Column({ name: 'is_sys_admin', type: 'boolean', default: false })
  isSysAdmin: boolean;

  @Column({ name: 'is_club_owner', type: 'boolean', default: false })
  isClubOwner: boolean;

  @Column({
    name: 'membership_status',
    type: 'enum',
    enum: MembershipStatus,
    default: MembershipStatus.ACTIVE,
  })
  membershipStatus: MembershipStatus;

  @Column({
    name: 'force_password_change',
    type: 'boolean',
    default: true,
  })
  forcePasswordChange: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
