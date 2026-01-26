import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ICacheService } from './cache.interface';
import { CacheTTL } from './cache.constants';

interface CacheEntry<T> {
    value: T;
    expiry: number;
}

@Injectable()
export class SimpleCacheService implements ICacheService, OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(SimpleCacheService.name);
    private readonly cache = new Map<string, CacheEntry<unknown>>();
    private readonly DEFAULT_TTL = CacheTTL.PERMISSIONS;

    // Memory yönetimi, sonrasinda disariya cikabilii
    private readonly MAX_SIZE = 5_000;
    private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 dakika
    private cleanupTimer: NodeJS.Timeout | null = null;

    onModuleInit(): void {
        this.startCleanupInterval();
        this.logger.log('Cache service initialized with cleanup interval');
    }

    onModuleDestroy(): void {
        this.stopCleanupInterval();
        this.cache.clear();
        this.logger.log('Cache service destroyed');
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        if (entry.expiry < Date.now()) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit: ${key}`);
        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlMs: number = this.DEFAULT_TTL): Promise<void> {
        // Max size kontrolü - doluysa en eski expired'ları temizle
        if (this.cache.size >= this.MAX_SIZE && !this.cache.has(key)) {
            this.evictExpiredOrOldest();
        }

        this.cache.set(key, {
            value,
            expiry: Date.now() + ttlMs,
        });
        this.logger.debug(`Cache set: ${key} (TTL: ${ttlMs}ms)`);
    }

    async delete(key: string): Promise<void> {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.logger.debug(`Cache deleted: ${key}`);
        }
    }

    async deleteByPattern(pattern: string): Promise<void> {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
        let count = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                count++;
            }
        }

        this.logger.debug(`Cache deleted by pattern "${pattern}": ${count} entries`);
    }

    // Util: Cache istatistikleri for debug babe
    getStats(): { size: number; maxSize: number; keys: string[] } {
        return {
            size: this.cache.size,
            maxSize: this.MAX_SIZE,
            keys: Array.from(this.cache.keys()),
        };
    }

    // --- Private Methods ---

    private startCleanupInterval(): void {
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpired();
        }, this.CLEANUP_INTERVAL);

        // Node.js'in timer'ı process'i canlı tutmasın
        this.cleanupTimer.unref();
    }

    private stopCleanupInterval(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }

    private cleanupExpired(): void {
        const now = Date.now();
        let count = 0;

        for (const [key, entry] of this.cache) {
            if (entry.expiry < now) {
                this.cache.delete(key);
                count++;
            }
        }

        if (count > 0) {
            this.logger.debug(`Cleanup: removed ${count} expired entries`);
        }
    }

    private evictExpiredOrOldest(): void {
        const now = Date.now();

        // Önce expired olanları sil
        for (const [key, entry] of this.cache) {
            if (entry.expiry < now) {
                this.cache.delete(key);
                return; // Bir tane silince yer açıldı
            }
        }

        // Expired yoksa en eski entry'yi sil
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.logger.debug(`Evicted oldest entry: ${oldestKey}`);
        }
    }
}
