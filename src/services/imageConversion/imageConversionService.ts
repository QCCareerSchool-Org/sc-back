import heicConvert from 'heic-convert';

import type { IImageConversionService } from './index.js';

export class ImageConversionService implements IImageConversionService {
  public async heicToJpg(buffer: Buffer): Promise<Buffer> {
    const input = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const converted = await heicConvert({
      buffer: input as unknown as ArrayBufferLike,
      format: 'JPEG',
      quality: 1,
    });
    return Buffer.from(converted);
  }

  public setFileExtension(filename: string, newExtension: string): string {
    // Find the last dot to identify the current extension
    const lastDotIndex = filename.lastIndexOf('.');

    // If no dot is found (-1), use the full filename
    // If a dot is found, take everything before it
    const base = (lastDotIndex === -1)
      ? filename
      : filename.substring(0, lastDotIndex);

    return `${base}.${newExtension}`;
  }
}
