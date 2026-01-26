export const CACHE_SERVICE = 'CACHE_SERVICE';

export const CacheTTL = {
    PERMISSIONS: 5 * 60 * 1000, // 5 dakika
    USER_ROLES: 10 * 60 * 1000, // 10 dakika
    CLUB_MEMBERS: 2 * 60 * 1000, // 2 dakika (daha dinamik)
} as const;

export const CacheKeys = {
    userPermissions: (userId: string) => `user:${userId}:permissions`,
    userRoles: (userId: string) => `user:${userId}:roles`,
    clubPermissions: (userId: string, clubId: string) =>
        `user:${userId}:club:${clubId}:permissions`,
} as const;
