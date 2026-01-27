import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class UserRoleRepository {
    constructor(
        @InjectRepository(UserRole)
        private readonly repo: Repository<UserRole>,
    ) { }

    // Intentionally empty for now, will be populated as needed by future features.
    // Service level 'userRepository' handles loading user with roles currently via relations.

    async findUserIdsByRoleId(roleId: string): Promise<string[]> {
        const userRoles = await this.repo.find({
            where: { roleId },
            select: ['userId'],
        });
        return userRoles.map(ur => ur.userId);
    }
}
