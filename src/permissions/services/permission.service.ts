import { Injectable, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserRepository } from '../../auth/repositories/user.repository';
import { RolePermissionRepository } from '../repositories/role-permission.repository';
import { UserPermissionRepository } from '../repositories/user-permission.repository';
import { UserRoleRepository } from '../repositories/user-role.repository';
import type { ICacheService } from '../../core/cache/cache.interface';
import { CACHE_SERVICE, CacheKeys, CacheTTL } from '../../core/cache/cache.constants';

@Injectable()
export class PermissionService {
    constructor(
        private userRepository: UserRepository,
        private rolePermissionRepository: RolePermissionRepository,
        private userPermissionRepository: UserPermissionRepository,
        private userRoleRepository: UserRoleRepository,
        private dataSource: DataSource,
        @Inject(CACHE_SERVICE) private cacheService: ICacheService,
    ) { }

    async getUserPermissions(userId: string): Promise<string[]> {
        const cacheKey = CacheKeys.userPermissions(userId);

        // Check cache
        const cachedPerms = await this.cacheService.get<string[]>(cacheKey);
        if (cachedPerms) {
            return cachedPerms;
        }

        // Fetch from DB
        const perms = await this.fetchFromDb(userId);

        // Set cache
        await this.cacheService.set(cacheKey, perms, CacheTTL.PERMISSIONS);

        return perms;
    }

    async invalidateCache(userId: string): Promise<void> {
        const cacheKey = CacheKeys.userPermissions(userId);
        await this.cacheService.delete(cacheKey);
    }

    async invalidateCacheForRole(roleId: string): Promise<void> {
        const userIds = await this.queryUserIdsByRole(roleId);
        // In a large system, this should be a job queue.
        // For now, parallel promise execution is acceptable.
        await Promise.all(userIds.map(id => this.invalidateCache(id)));
    }

    private async queryUserIdsByRole(roleId: string): Promise<string[]> {
        return this.userRoleRepository.findUserIdsByRoleId(roleId);
    }

    private async fetchFromDb(userId: string): Promise<string[]> {
        const user = await this.userRepository.findWithRoles(userId);
        if (!user) return [];

        let permissions: string[] = [];

        // 1. Role Permissions (from multiple roles)
        if (user.roles?.length > 0) {
            const roleIds = user.roles.map(ur => ur.roleId);
            const rolePerms = await this.rolePermissionRepository.findByRoleIds(roleIds);
            permissions = [...permissions, ...rolePerms.map(rp => rp.permissionCode)];
        }

        // 2. Extra User Permissions
        const userPerms = await this.userPermissionRepository.findByUserId(userId);
        permissions = [...permissions, ...userPerms.map(up => up.permissionCode)];

        // Deduplicate
        return [...new Set(permissions)];
    }

    // Responsibility check moved to ActivitiesService to avoid circular dependency and tight coupling.
    // Use AccessContextGuard with ActivitiesService for responsibility verification.
}
