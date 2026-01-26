import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { FileStatus, FileOwnerType, StorageProvider } from '../files.contract';

@Entity('files')
@Index(['clubId', 'ownerType', 'ownerId'])
@Index(['clubId', 'status', 'createdAt'])
@Index(['storageKey'], { unique: true })
@Index(['checksum', 'clubId'])
@Index(['deletedAt'])
export class FileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  clubId!: string;

  @Column({ length: 500 })
  originalName!: string;

  @Column({ length: 100 })
  mimeType!: string;

  @Column({ length: 100 })
  detectedMimeType!: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseInt(value, 10),
    },
  })
  size!: number;

  @Column({ length: 64 })
  checksum!: string;

  @Column({ unique: true })
  storageKey!: string;

  @Column({ type: 'enum', enum: StorageProvider })
  storageProvider!: StorageProvider;

  @Column({ nullable: true, length: 100 })
  bucket?: string;

  @Column({ type: 'enum', enum: FileOwnerType, nullable: true })
  ownerType?: FileOwnerType;

  @Column({ nullable: true })
  ownerId?: string;

  @Column({ type: 'enum', enum: FileStatus })
  status!: FileStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true })
  attachedAt?: Date;

  @Column({ nullable: true })
  deletedAt?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @BeforeInsert()
  @BeforeUpdate()
  validateDates() {
    if (this.deletedAt && this.deletedAt > new Date()) {
      throw new Error('deletedAt cannot be in the future');
    }
    if (this.attachedAt && this.attachedAt > new Date()) {
      throw new Error('attachedAt cannot be in the future');
    }
  }
}
