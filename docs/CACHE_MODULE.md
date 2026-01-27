# Cache Module - How to Use

In-memory cache servisi. Sık erişilen verileri (permissions, roles, vb.) bellekte tutarak DB yükünü azaltır.

---

## Quick Start

### 1. Inject Et

```typescript
import { Inject, Injectable } from '@nestjs/common';
import { CACHE_SERVICE, ICacheService } from '../core/cache';

@Injectable()
export class MyService {
  constructor(
    @Inject(CACHE_SERVICE) private readonly cache: ICacheService,
  ) {}
}
```

> **Not:** `CoreModule` global olduğu için import etmene gerek yok!

---

## Temel Kullanım

### Değer Okuma

```typescript
const data = await this.cache.get<string[]>('my-key');
// data: string[] | null
```

### Değer Yazma

```typescript
// Default TTL (5 dakika)
await this.cache.set('my-key', ['value1', 'value2']);

// Custom TTL
await this.cache.set('my-key', data, 2 * 60 * 1000); // 2 dakika
```

### Değer Silme

```typescript
await this.cache.delete('my-key');
```

### Pattern ile Silme

```typescript
// user:123 ile başlayan tüm key'leri sil
await this.cache.deleteByPattern('user:123:*');
```

---

## Hazır TTL Değerleri

```typescript
import { CacheTTL } from '../core/cache';

await this.cache.set(key, data, CacheTTL.PERMISSIONS);  // 5 dk
await this.cache.set(key, data, CacheTTL.USER_ROLES);   // 10 dk
await this.cache.set(key, data, CacheTTL.CLUB_MEMBERS); // 2 dk
```

---

## Hazır Key Builders

```typescript
import { CacheKeys } from '../core/cache';

const key1 = CacheKeys.userPermissions('user-uuid');
// → "user:user-uuid:permissions"

const key2 = CacheKeys.userRoles('user-uuid');
// → "user:user-uuid:roles"

const key3 = CacheKeys.clubPermissions('user-uuid', 'club-uuid');
// → "user:user-uuid:club:club-uuid:permissions"
```

---

## Örnek: Cache-Aside Pattern

```typescript
async getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = CacheKeys.userPermissions(userId);
  
  // 1. Cache'e bak
  const cached = await this.cache.get<string[]>(cacheKey);
  if (cached) return cached;

  // 2. DB'den çek
  const permissions = await this.permissionRepo.findByUserId(userId);
  
  // 3. Cache'e yaz
  await this.cache.set(cacheKey, permissions, CacheTTL.PERMISSIONS);
  
  return permissions;
}
```

---

## Cache Invalidation

```typescript
// User logout veya permission değişikliğinde
async onUserLogout(userId: string): Promise<void> {
  await this.cache.deleteByPattern(`user:${userId}:*`);
}

// Tek bir değeri invalidate et
async onPermissionChange(userId: string): Promise<void> {
  await this.cache.delete(CacheKeys.userPermissions(userId));
}
```

---

## Debug

```typescript
// Cache durumunu görmek için (sadece development)
const stats = (this.cache as any).getStats();
console.log(stats);
// { size: 42, maxSize: 5000, keys: ['user:1:permissions', ...] }
```

---

## Önemli Notlar

| Konu | Bilgi |
|------|-------|
| **Max Size** | 5000 entry (aşılırsa en eski silinir) |
| **Cleanup** | Her 5 dakikada expired entry'ler temizlenir |
| **Thread Safety** | Node.js single-threaded, sorun yok |
| **Restart** | Process restart'ta cache sıfırlanır (beklenen davranış) |

---

## Yeni Key Ekleme

`cache.constants.ts` dosyasına ekle:

```typescript
export const CacheKeys = {
  // Mevcut key'ler...
  
  // Yeni key ekle
  myNewKey: (param: string) => `prefix:${param}:suffix`,
} as const;

export const CacheTTL = {
  // Mevcut TTL'ler...
  
  // Yeni TTL ekle
  MY_NEW_TTL: 3 * 60 * 1000, // 3 dakika
} as const;
```
