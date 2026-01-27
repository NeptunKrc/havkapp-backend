import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleRef } from '@nestjs/core';
import { CHECK_CONTEXT_KEY, CheckContextOptions } from '../decorators/check-context.decorator';
import { ActivitiesService } from '../../activities/activities.service';

@Injectable()
export class AccessContextGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private moduleRef: ModuleRef,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const metadata = this.reflector.get<CheckContextOptions>(CHECK_CONTEXT_KEY, context.getHandler());
        if (!metadata) {
            return true; // No specific ownership check required
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        const resourceId = request.params[metadata.param || 'id'] || request.body[metadata.param || 'id'];

        if (!user || !resourceId) return false;

        // Dynamic Service Resolution based on Resource Type
        // We avoid strict dependency injection in constructor to keep this guard flexible and avoid circular deps.
        if (metadata.resource === 'activity') {
            const activitiesService = this.moduleRef.get(ActivitiesService, { strict: false });
            // Check if user is responsible for this activity
            // Assuming user.sub is the ID from JWT
            return activitiesService.isUserResponsible(user.sub, resourceId);
        }

        // Add other resource checks here
        return false;
    }
}
