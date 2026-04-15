import type { Result } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import heicConvert from 'heic-convert';
import sharp from 'sharp';

import type { IImageConversionService } from './index.js';

export class ImageConversionService implements IImageConversionService {
  public async heicToJpg(buffer: Buffer): Promise<Result<Buffer>> {
    try {
      const input = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      const converted = await heicConvert({
        buffer: input as unknown as ArrayBufferLike,
        format: 'JPEG',
        quality: 1,
      });
      return success(Buffer.from(converted));
    } catch (err) {
      return failure(err instanceof Error ? err : Error(String(err)));
    }
  }

  public async avifToJpg(buffer: Buffer): Promise<Result<Buffer>> {
    try {
      return success(await sharp(buffer).jpeg({ quality: 100 }).toBuffer());
    } catch (err) {
      return failure(err instanceof Error ? err : Error(String(err)));
    }
  }

  public async webpToJpg(buffer: Buffer): Promise<Result<Buffer>> {
    try {
      return success(await sharp(buffer).jpeg({ quality: 100 }).toBuffer());
    } catch (err) {
      return failure(err instanceof Error ? err : Error(String(err)));
    }
  }

  public withFileExtension(filename: string, newExtension: string): string {
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
