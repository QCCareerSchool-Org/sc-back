import type { Result } from 'generic-result-type';
import { ImageConversionService } from './imageConversionService.js';

export interface IImageConversionService {
  heicToJpg: (buffer: Buffer) => Promise<Result<Buffer>>;
  avifToJpg: (buffer: Buffer) => Promise<Result<Buffer>>;
  webpToJpg: (buffer: Buffer) => Promise<Result<Buffer>>;

  /**
   * Adds or replaces the file extension with a new one
   * @param {string} fileName Original name (e.g., "vacation" or "img.png")
   * @param {string} newExtension The new extension to use (e.g. "jpg")
   * @returns {string} A filename with the new extension
   */
  withFileExtension: (filename: string, newExtension: string) => string;
}

export const imageConversionService = new ImageConversionService();
