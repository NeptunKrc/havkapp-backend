import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';
import { Role } from './entities/role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserPermission } from './entities/user-permission.entity';
import { UserRole } from './entities/user-role.entity';
import { PermissionDefinition } from './entities/permission-definition.entity';
import { RoleRepository } from './repositories/role.repository';
import { RolePermissionRepository } from './repositories/role-permission.repository';
import { UserPermissionRepository } from './repositories/user-permission.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { UserRepository } from '../auth/repositories/user.repository';
import { User } from '../auth/entities/user.entity';
import { AccessContextGuard } from './guards/access-context.guard';
import { ActivitiesModule } from '../activities/activities.module';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([
            Role,
            RolePermission,
            UserPermission,
            UserRole,
            User,
            PermissionDefinition
        ]),
        ActivitiesModule // Needed for AccessContextGuard to start context checks
    ],
    providers: [
        PermissionService,
        RoleService,
        RoleRepository,
        RolePermissionRepository,
        UserPermissionRepository,
        UserRoleRepository,
        UserRepository,
        AccessContextGuard
    ],
    exports: [
        PermissionService,
        RoleService,
        RoleRepository,
        AccessContextGuard
    ]
})
export class PermissionsModule { }
