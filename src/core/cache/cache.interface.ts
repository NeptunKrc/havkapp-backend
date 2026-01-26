export interface ICacheService {
    /**
     * Cache'den değer al
     * @returns Değer veya null (bulunamazsa/expire olduysa)
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Cache'e değer yaz
     * @param ttlMs Time-to-live milisaniye cinsinden (default: 5 dakika)
     */
    set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

    /**
     * Cache'den sil
     */
    delete(key: string): Promise<void>;

    /**
     * Pattern'e uyan tüm key'leri sil
     * Örnek: 'user:123:*' → user:123:permissions, user:123:roles vs.
     */
    deleteByPattern?(pattern: string): Promise<void>;
}
