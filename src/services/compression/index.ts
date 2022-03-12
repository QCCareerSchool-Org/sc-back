import type { Transform } from 'stream';

export interface ICompressionService {
  gzip: (buffer: Buffer) => Promise<Buffer>;
  gunzip: (buffer: Buffer) => Promise<Buffer>;
  createGunzip: () => Transform;
}
