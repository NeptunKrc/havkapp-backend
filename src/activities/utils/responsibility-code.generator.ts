//the kod oluşturucu
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 4;

export function generateResponsibilityCode(): string {
  let result = '';

  for (let i = 0; i < CODE_LENGTH; i++) {
    const index = Math.floor(Math.random() * CHARSET.length);
    result += CHARSET[index];
  }

  return result;
}
