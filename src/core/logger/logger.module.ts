import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { getTransports, redactPaths } from './logger.config';

/**
 * Esnek Loglama Modülü - Toggle Switch Yaklaşımı
 *
 * Environment variable'lar ile kontrol edilir:
 * - LOGGING_ENABLED: Master switch (true/false)
 * - LOG_LEVEL: silent | error | warn | info | debug
 * - LOG_TO_FILE: Dosyaya yaz (true/false)
 * - LOG_REQUESTS: HTTP request'leri logla (true/false)
 * - LOG_PRETTY: Renkli console çıktısı (development)
 * - LOGTAIL_TOKEN: Better Stack token (opsiyonel)
 *
 * @example
 * // Production - Kapalı başla
 * LOGGING_ENABLED=false
 * LOG_LEVEL=silent
 *
 * @example
 * // Debug modu - Sadece hatalar
 * LOGGING_ENABLED=true
 * LOG_LEVEL=error
 * LOG_TO_FILE=true
 */
@Module({
    imports: [
        LoggerModule.forRoot({
            pinoHttp: {
                // Master switch - loglamayı tamamen kapat
                enabled: process.env.LOGGING_ENABLED === 'true',

                // Log seviyesi
                level: process.env.LOG_LEVEL || 'silent',

                // Transport konfigürasyonu (dosya, console, remote)
                transport: getTransports(),

                // HTTP request/response otomatik loglama
                autoLogging: process.env.LOG_REQUESTS === 'true',

                // Hassas verileri gizle
                redact: redactPaths,

                // Request ID için custom props
                customProps: (req) => ({
                    userId: (req as any).user?.id,
                }),

                // Log formatı
                formatters: {
                    level: (label) => ({ level: label }),
                },
            },
        }),
    ],
    exports: [LoggerModule],
})
export class AppLoggerModule { }
