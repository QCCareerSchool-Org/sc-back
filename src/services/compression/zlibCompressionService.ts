import type { Transform } from 'stream';
import zlib from 'zlib';
import type { ICompressionService } from './index.js';

export class ZLibCompressionService implements ICompressionService {

  public async gzip(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(buffer, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  public async gunzip(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      });
    });
  }

  public createGunzip(): Transform {
    return zlib.createGunzip();
  }
}
