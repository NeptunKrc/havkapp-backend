
import { SetMetadata } from '@nestjs/common';

export const CHECK_CONTEXT_KEY = 'check_context';

export interface CheckContextOptions {
    resource: 'activity' | 'club' | 'user'; // Extend as needed
    param?: string; // e.g. 'id'
}

export const CheckContext = (resource: CheckContextOptions['resource'], param: string = 'id') =>
    SetMetadata(CHECK_CONTEXT_KEY, { resource, param });
