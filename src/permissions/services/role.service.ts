import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role } from '../entities/role.entity';
import { RoleRepository } from '../repositories/role.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleService {
    constructor(
        private roleRepository: RoleRepository,
        private rolePermissionRepository: RolePermissionRepository,
        private permissionService: PermissionService,
    ) { }

    async createRole(clubId: string, name: string, permissionCodes: string[]): Promise<Role> {
        const existing = await this.roleRepository.findByClubIdAndName(clubId, name);
        if (existing) {
            throw new BadRequestException('Role with this name already exists in the club');
        }

        const savedRole = await this.roleRepository.create({ clubId, name });

        if (permissionCodes.length > 0) {
            const perms = permissionCodes.map(code =>
                this.rolePermissionRepository.create(savedRole.id, code)
            );
            await this.rolePermissionRepository.saveMany(perms);
        }

        return (await this.roleRepository.findOneWithPermissions(savedRole.id))!;
    }

    async findAllByClub(clubId: string): Promise<Role[]> {
        return this.roleRepository.findAllByClub(clubId);
    }

    async findOne(id: string): Promise<Role> {
        const role = await this.roleRepository.findOneWithPermissions(id);
        if (!role) throw new NotFoundException('Role not found');
        return role;
    }

    async updateRole(id: string, name?: string, permissionCodes?: string[]): Promise<Role> {
        const role = await this.findOne(id);

        if (name) {
            role.name = name;
            await this.roleRepository.save(role);
        }

        if (permissionCodes) {
            // Clear existing
            await this.rolePermissionRepository.deleteByRoleId(id);

            // Add new
            const perms = permissionCodes.map(code =>
                this.rolePermissionRepository.create(id, code)
            );
            await this.rolePermissionRepository.saveMany(perms);

            // Invalidate cache for all users with this role
            await this.permissionService.invalidateCacheForRole(id);
        }

        return this.findOne(id);
    }

    async deleteRole(id: string): Promise<void> {
        const affected = await this.roleRepository.delete(id);
        if (!affected) throw new NotFoundException('Role not found');
    }
}
