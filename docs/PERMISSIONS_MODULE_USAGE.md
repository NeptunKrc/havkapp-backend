# Permissions Modülü Entegrasyon Rehberi

Havkapp permission sistemi, modüler ve güvenli bir yetki yönetimi sağlar. Bu rehber, geliştirdiğiniz modüllere permission sistemini nasıl entegre edeceğinizi anlatır.

## İçindekiler
1. [Endpoint Koruma (Statik Yetkiler)](#1-endpoint-koruma-statik-yetkiler)
2. [Sorumluluk Kontrolü (Dinamik Yetkiler)](#2-sorumluluk-kontrolü-dinamik-yetkiler)
3. [Programatik Rol Yönetimi](#3-programatik-rol-yönetimi)
4. [Mevcut Yetkiler Listesi](#4-mevcut-yetkiler-listesi)

---

## 1. Endpoint Koruma (Statik Yetkiler)

Bir endpoint'i (API ucunu) sadece belirli bir yetkiye sahip kullanıcıların çağırmasını istiyorsanız:

### Adımlar:
1.  Controller'ınıza veya metodunuza `PermissionsGuard` ekleyin.
2.  `@RequirePermission` dekoratörü ile gerekli yetkiyi belirtin.

### Örnek (Faaliyet Oluşturma):

```typescript
import { UseGuards } from '@nestjs/common';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@Controller('activities')
@UseGuards(PermissionsGuard) // Guard'ı Controller seviyesinde de ekleyebilirsiniz
export class ActivitiesController {

  @Post()
  @RequirePermission(Permission.ACTIVITY_CREATE) // Sadece bu yetkiye sahip olanlar erişebilir
  create(@Body() createDto: CreateActivityDto) {
    return this.activitiesService.create(createDto);
  }
}
```

> **Önemli:** `PermissionsGuard`, kullanıcının `isSysAdmin` olup olmamasına bakmaksızın **mutlaka** ilgili yetkinin tanımlı olmasını bekler. Bypass yoktur.

---

## 2. Sorumluluk Kontrolü (Dinamik Yetkiler)

Bazen kullanıcının genel bir yetkisi değil, o anki işlem özelinde bir sorumluluğu olup olmadığına bakmak gerekir. Örneğin: *"Bu kullanıcı, ID'si 123 olan faaliyetin sorumlusu mu?"*

Bunun için `AccessContextGuard` ve `@CheckOwner` dekoratörünü kullanırız.

### Adımlar:
1.  Metoda `AccessContextGuard` ekleyin.
2.  `@CheckOwner` ile hangi kaynağı (`activity`) ve hangi parametreyi (`id`) kontrol edeceğini belirtin.

### Örnek (Faaliyet İptal Etme):

```typescript
import { AccessContextGuard } from '../permissions/guards/access-context.guard';
import { CheckContext } from '../permissions/decorators/check-context.decorator';

@Patch(':id/cancel')
@UseGuards(AccessContextGuard) // Önce context kontrolü yapılır
@CheckContext('activity', 'id') // URL'deki :id parametresini alıp, kullanıcının o faaliyetten sorumlu olup olmadığına bakar
async cancel(@Param('id') id: string) {
  // Eğer buraya geldiyse, kullanıcı bu faaliyetin resmi sorumlusudur (session tablosunda kaydı vardır).
  return this.activitiesService.cancel(id);
}
```

> **Not:** `AccessContextGuard`, `activity_responsibility_sessions` tablosunu kontrol eder. Kullanıcının o an aktif bir sorumluluk kodu girmiş olması gerekir.

---

## 3. Programatik Rol Yönetimi

Başka bir modülde (örneğin Auth veya Club modülü) kullanıcıya rol atamanız gerekiyorsa `RoleService`'i kullanabilirsiniz.

### Kullanım:
Servisinize `RoleService`'i inject edin.

```typescript
import { RoleService } from '../permissions/services/role.service';

@Injectable()
export class SomeService {
  constructor(private roleService: RoleService) {}

  async assignDefaultRole(userId: string, clubId: string) {
    // Örnek: Kulüpteki 'Member' rolünü bul ve kullanıcıya ata
    // Bu mantık genelde UserRoleRepository veya RoleService üzerinden kurgulanır.
    // Detaylı rol atama metodları RoleService veya UserRoleRepository'ye eklenebilir.
  }
  
  async createCustomRole(clubId: string, name: string) {
    // Yeni bir rol oluştur ve yetkileri bas
    await this.roleService.createRole(clubId, name, [
        Permission.ACTIVITY_VIEW,
        Permission.QR_SCAN
    ]);
  }
}
```

---

## 4. Mevcut Yetkiler Listesi

`Permission` enum'ı (`src/permissions/enums/permission.enum.ts`) içindeki tüm yetkileri kullanabilirsiniz.

| Kod | Açıklama |
|-----|----------|
| `ACTIVITY_CREATE` | Faaliyet oluşturma izni |
| `ACTIVITY_DELETE` | Faaliyet silme izni |
| `QR_SCAN` | QR kod okutma ve işlem yapma izni |
| ... | (Enum dosyasına bakınız) |
