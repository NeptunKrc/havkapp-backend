import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPermission } from '../entities/user-permission.entity';

@Injectable()
export class UserPermissionRepository {
    constructor(
        @InjectRepository(UserPermission)
        private readonly repo: Repository<UserPermission>,
    ) { }

    async findByUserId(userId: string): Promise<UserPermission[]> {
        return this.repo.find({ where: { userId } });
    }
}
