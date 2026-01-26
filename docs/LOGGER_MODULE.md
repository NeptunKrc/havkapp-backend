# Logger Module Documentation

> **Esnek, toggle-tabanlı loglama sistemi** - Environment variable'lar ile runtime'da kontrol edilebilir.

## Özellikler

- ✅ **Master Switch** - Tek değişkenle tüm loglamayı aç/kapa
- ✅ **Çoklu Transport** - Console, dosya ve remote logging desteği
- ✅ **Hassas Veri Koruması** - Password, token gibi veriler otomatik gizlenir
- ✅ **Better Stack Entegrasyonu** - Remote log toplama için hazır
- ✅ **Pretty Print** - Development'ta renkli, okunabilir loglar

---

## Hızlı Başlangıç

### 1. Modül Kurulumu

Modül zaten `AppModule`'a import edilmiştir:

```typescript
// src/app.module.ts
import { AppLoggerModule } from './core/logger';

@Module({
  imports: [
    AppLoggerModule,
    // ...
  ],
})
export class AppModule {}
```

### 2. Service'lerde Kullanım

```typescript
import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class UserService {
  constructor(
    @InjectPinoLogger(UserService.name)
    private readonly logger: PinoLogger,
  ) {}

  async createUser(dto: CreateUserDto) {
    this.logger.info({ dto }, 'Creating new user');
    
    try {
      const user = await this.userRepository.save(dto);
      this.logger.info({ userId: user.id }, 'User created successfully');
      return user;
    } catch (error) {
      this.logger.error({ error, dto }, 'Failed to create user');
      throw error;
    }
  }
}
```

### 3. Controller'larda Kullanım

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Controller('users')
export class UserController {
  constructor(
    @InjectPinoLogger(UserController.name)
    private readonly logger: PinoLogger,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto) {
    this.logger.debug({ dto }, 'Received create request');
    // ...
  }
}
```

---

## Environment Variables

| Değişken | Değerler | Varsayılan | Açıklama |
|----------|----------|------------|----------|
| `LOGGING_ENABLED` | `true` / `false` | `false` | Master switch - loglamayı tamamen açar/kapatır |
| `LOG_LEVEL` | `silent`, `error`, `warn`, `info`, `debug` | `silent` | Log seviyesi |
| `LOG_TO_FILE` | `true` / `false` | `false` | Dosyaya loglama |
| `LOG_FILE_PATH` | path | `./logs/app.log` | Log dosyası yolu |
| `LOG_REQUESTS` | `true` / `false` | `false` | HTTP request/response loglaması |
| `LOG_PRETTY` | `true` / `false` | `false` | Renkli console çıktısı (sadece development) |
| `LOGTAIL_TOKEN` | string | - | Better Stack entegrasyonu için token |

---

## Kullanım Senaryoları

### 🔇 Production - Kapalı (Varsayılan)

```env
LOGGING_ENABLED=false
LOG_LEVEL=silent
```

### 🔴 Production - Sadece Hatalar

```env
LOGGING_ENABLED=true
LOG_LEVEL=error
LOG_TO_FILE=true
```

### 🟡 Production - Uyarı ve Hatalar

```env
LOGGING_ENABLED=true
LOG_LEVEL=warn
LOG_TO_FILE=true
LOGTAIL_TOKEN=your-token-here
```

### 🟢 Development - Full Debug

```env
NODE_ENV=development
LOGGING_ENABLED=true
LOG_LEVEL=debug
LOG_PRETTY=true
LOG_REQUESTS=true
```

---

## Log Seviyeleri

| Seviye | Kullanım | Örnek |
|--------|----------|-------|
| `silent` | Hiç log yok | Production başlangıç durumu |
| `error` | Kritik hatalar | Database bağlantı hatası, unhandled exception |
| `warn` | Uyarılar | Deprecated API kullanımı, yavaş query |
| `info` | Önemli olaylar | Kullanıcı login, ödeme işlemi |
| `debug` | Detaylı bilgi | Request/response, function çağrıları |

---

## Log Yapısı (Best Practices)

### ✅ Doğru Kullanım

```typescript
// Context objesi + mesaj
this.logger.info({ userId, action: 'login' }, 'User logged in');

// Hata loglama
this.logger.error({ error: err, userId }, 'Payment failed');

// Debug bilgisi
this.logger.debug({ query, params }, 'Executing database query');
```

### ❌ Yanlış Kullanım

```typescript
// String concatenation kullanma
this.logger.info(`User ${userId} logged in`);  // ❌

// Doğru format
this.logger.info({ userId }, 'User logged in'); // ✅
```

---

## Otomatik Gizlenen Veriler

Aşağıdaki alanlar loglardan **otomatik olarak** `[Redacted]` ile değiştirilir:

- `req.headers.authorization`
- `req.headers.cookie`
- `req.body.password`
- `req.body.currentPassword`
- `req.body.newPassword`
- `req.body.confirmPassword`
- `req.body.token`
- `req.body.refreshToken`

---

## Transport Yapısı

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Pino HTTP     │
└────────┬────────┘
         │
    ┌────┼────┬─────────────┐
    ▼    ▼    ▼             ▼
┌──────┐┌──────┐┌───────┐┌──────────┐
│File  ││Pretty││Console││BetterStack│
│(.log)││(dev) ││(prod) ││ (remote) │
└──────┘└──────┘└───────┘└──────────┘
```

---

## Modül Dosya Yapısı

```
src/core/logger/
├── index.ts           # Public exports
├── logger.module.ts   # AppLoggerModule tanımı
└── logger.config.ts   # Transport ve redact konfigürasyonu
```

---

## Troubleshooting

### Loglar görünmüyor

1. `LOGGING_ENABLED=true` olduğundan emin olun
2. `LOG_LEVEL` değerinin `silent` olmadığını kontrol edin
3. Pretty print için `NODE_ENV=development` ve `LOG_PRETTY=true` gerekir

### Dosya logu oluşmuyor

1. `LOG_TO_FILE=true` ayarlandığından emin olun
2. `LOG_FILE_PATH` dizinine yazma izni olduğunu kontrol edin
3. Uygulama başlatılırken logs klasörü otomatik oluşturulur

### Request logları çıkmıyor

`LOG_REQUESTS=true` ayarlayın. Bu otomatik HTTP request/response loglamasını aktifleştirir.
