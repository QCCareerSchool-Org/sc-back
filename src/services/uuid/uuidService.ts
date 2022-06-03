import { v1 } from 'uuid';

import type { IUUIDService } from './index.js';

export class UUIDService implements IUUIDService {

  public createUUID(): string {
    return v1();
  }

  public uuidToBin(uuid: string): Buffer {
    if (uuid.length !== 36) {
      throw Error('Invalid uuid length');
    }
    if (!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/u.test(uuid)) {
      throw Error('Invalid uuid format');
    }
    // remove hyphens
    const hex = uuid.replace(/-/gu, '');
    const buffer = Buffer.from(hex, 'hex');
    return this.swap(buffer);
  }

  public binToUUID(buffer: Buffer): string {
    if (buffer.length !== 16) {
      throw Error('Invalid buffer length');
    }
    const unswappedBuffer = this.unswap(buffer);
    const hex = unswappedBuffer.toString('hex');
    // re-add hyphens
    return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
  }

  private swap(buffer: Buffer): Buffer {
    if (buffer.length !== 16) {
      throw Error('Invalid buffer length');
    }
    const swappedBuffer = Buffer.alloc(16);
    swappedBuffer[0] = buffer[6];
    swappedBuffer[1] = buffer[7];
    swappedBuffer[2] = buffer[4];
    swappedBuffer[3] = buffer[5];
    swappedBuffer[4] = buffer[0];
    swappedBuffer[5] = buffer[1];
    swappedBuffer[6] = buffer[2];
    swappedBuffer[7] = buffer[3];
    for (let i = 8; i < 16; i++) {
      swappedBuffer[i] = buffer[i];
    }
    return swappedBuffer;
  }

  private unswap(buffer: Buffer): Buffer {
    if (buffer.length !== 16) {
      throw Error('Invalid buffer length');
    }
    const unswappedBuffer = Buffer.alloc(16);
    unswappedBuffer[0] = buffer[4];
    unswappedBuffer[1] = buffer[5];
    unswappedBuffer[2] = buffer[6];
    unswappedBuffer[3] = buffer[7];
    unswappedBuffer[4] = buffer[2];
    unswappedBuffer[5] = buffer[3];
    unswappedBuffer[6] = buffer[0];
    unswappedBuffer[7] = buffer[1];
    for (let i = 8; i < 16; i++) {
      unswappedBuffer[i] = buffer[i];
    }
    return unswappedBuffer;
  }
}
