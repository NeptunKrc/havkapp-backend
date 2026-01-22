import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QrController } from './qr.controller';
import { QrService } from './services/qr.service';
import { QrRepository } from './repositories/qr.repository';
import { QrCodeEntity } from './entities/qr-code.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QrCodeEntity])],
  controllers: [QrController],
  providers: [QrService, QrRepository],
  exports: [QrService],
})
export class QrModule {}
