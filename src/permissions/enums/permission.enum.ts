export enum Permission {
    // Activity
    ACTIVITY_CREATE = 'activity:create',
    ACTIVITY_UPDATE = 'activity:update',
    ACTIVITY_DELETE = 'activity:delete',
    ACTIVITY_START = 'activity:start',
    ACTIVITY_COMPLETE = 'activity:complete',
    ACTIVITY_VIEW = 'activity:view',

    // User Management
    USER_CREATE = 'user:create',
    USER_UPDATE = 'user:update',
    USER_DELETE = 'user:delete',
    USER_VIEW = 'user:view',
    USER_ASSIGN_ROLE = 'user:assign_role',
    USER_GRANT_PERMISSION = 'user:grant_permission',

    // Role Management
    ROLE_CREATE = 'role:create',
    ROLE_UPDATE = 'role:update',
    ROLE_DELETE = 'role:delete',
    ROLE_VIEW = 'role:view',

    // QR
    QR_CREATE = 'qr:create',
    QR_VALIDATE = 'qr:validate',
    QR_REVOKE = 'qr:revoke',

    // File
    FILE_UPLOAD = 'file:upload',
    FILE_DELETE = 'file:delete',
    FILE_VIEW = 'file:view',

    // Notification
    NOTIFICATION_SEND = 'notification:send',

    // Club (SysAdmin only)
    CLUB_CREATE = 'club:create',
    CLUB_DELETE = 'club:delete',
}
