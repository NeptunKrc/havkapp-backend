import * as QRCode from 'qrcode';

export type QrImageFormat = 'svg' | 'png';

export class QrImageGenerator {
  //Generate QR image dynamically based on ID payload qrId
  static async generate(
    qrId: string,
    format: QrImageFormat = 'svg',
  ): Promise<Buffer | string> {
    if (format === 'png') {
      return QRCode.toBuffer(qrId, {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 6,
      });
    }

    // default = svg
    return QRCode.toString(qrId, {
      type: 'svg',
      errorCorrectionLevel: 'M',
      margin: 2,
    });
  }
}
