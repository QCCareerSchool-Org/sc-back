import crypto from 'crypto';
import bcrypt from 'bcrypt';

import { ICryptoService } from '.';

export class NodeCryptoService implements ICryptoService {

  public async randomBytes(size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(size, (err, buf) => {
        if (err) {
          return reject(err);
        }
        return resolve(buf);
      });
    });
  }

  public md5Hash(buf: Buffer): string {
    return crypto.createHash('md5').update(buf).digest('hex');
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
}
