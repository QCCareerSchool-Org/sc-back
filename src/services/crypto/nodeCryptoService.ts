import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';

import type { ICryptoService } from './index.js';

if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}

const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

export class NodeCryptoService implements ICryptoService {

  public async randomBytes(size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      randomBytes(size, (err, buf) => {
        if (err) {
          return reject(err);
        }
        return resolve(buf);
      });
    });
  }

  public md5Hash(buf: Buffer): string {
    return createHash('md5').update(buf).digest('hex');
  }

  public async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash.replace('$2y$', '$2b$'));
  }

  public async createHash(password: string, rounds = 13): Promise<string> {
    return bcrypt.hash(password, rounds);
  }

  public async decodeSIN(buffer: Buffer): Promise<string> {
    return '';
  }

  public sha256Hmac(data: Buffer | string, secret: string): string {
    return createHmac('sha256', secret).update(data).digest('base64');
  }

  public aes256gcmEncrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([ iv, authTag, encrypted ]).toString('base64url');
  }

  public aes256gcmDecrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, 'base64url');

    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const encrypted = buf.subarray(28);

    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
  }
}
