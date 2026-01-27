import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RolePermission } from '../entities/role-permission.entity';

@Injectable()
export class RolePermissionRepository {
    constructor(
        @InjectRepository(RolePermission)
        private readonly repo: Repository<RolePermission>,
    ) { }

    create(roleId: string, permissionCode: string): RolePermission {
        return this.repo.create({ roleId, permissionCode });
    }

    async saveMany(permissions: RolePermission[]): Promise<RolePermission[]> {
        return this.repo.save(permissions);
    }

    async deleteByRoleId(roleId: string): Promise<void> {
        await this.repo.delete({ roleId });
    }

    async findByRoleIds(roleIds: string[]): Promise<RolePermission[]> {
        if (roleIds.length === 0) return [];

        return this.repo.createQueryBuilder('rp')
            .where('rp.roleId IN (:...roleIds)', { roleIds })
            .getMany();
    }
}
