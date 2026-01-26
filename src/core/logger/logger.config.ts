import type { Options as PinoHttpOptions } from 'pino-http';

interface TransportTarget {
    target: string;
    options?: Record<string, unknown>;
    level?: string;
}

/**
 * Transport konfigürasyonunu environment variable'lara göre oluşturur.
 *
 * Desteklenen modlar:
 * - Silent: Hiç log yok (varsayılan)
 * - File: Lokal dosyaya yaz
 * - Console: Renkli terminal çıktısı (development)
 * - Better Stack: Remote logging (token varsa)
 */
export function getTransports(): PinoHttpOptions['transport'] {
    const targets: TransportTarget[] = [];

    // 📁 Lokal dosya transport
    if (process.env.LOG_TO_FILE === 'true') {
        targets.push({
            target: 'pino/file',
            options: {
                destination: process.env.LOG_FILE_PATH || './logs/app.log',
                mkdir: true, // Klasör yoksa oluştur
            },
            level: process.env.LOG_LEVEL || 'error',
        });
    }

    // ☁️ Better Stack transport (ileride aktif edilebilir)
    if (process.env.LOGTAIL_TOKEN) {
        targets.push({
            target: '@logtail/pino',
            options: {
                sourceToken: process.env.LOGTAIL_TOKEN,
            },
            level: 'warn', // Remote'a sadece uyarı ve hataları gönder
        });
    }

    // 🖥️ Console pretty (development)
    if (
        process.env.NODE_ENV === 'development' &&
        process.env.LOG_PRETTY === 'true'
    ) {
        targets.push({
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
            level: process.env.LOG_LEVEL || 'info',
        });
    }

    // Transport yoksa undefined dön (pino varsayılanını kullanır)
    return targets.length > 0 ? { targets } : undefined;
}

/**
 * Hassas verileri loglardan çıkarmak için redact listesi
 */
export const redactPaths: string[] = [
    'req.headers.authorization',
    'req.headers.cookie',
    'req.body.password',
    'req.body.currentPassword',
    'req.body.newPassword',
    'req.body.confirmPassword',
    'req.body.token',
    'req.body.refreshToken',
];
