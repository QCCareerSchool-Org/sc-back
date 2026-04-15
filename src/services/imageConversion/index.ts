import { ImageConversionService } from './imageConversionService.js';

export interface IImageConversionService {
  heicToJpg: (buffer: Buffer) => Buffer;

  /**
   * Adds or replaces the file extension with a new one
   * @param {string} fileName Original name (e.g., "vacation" or "img.png")
   * @param {string} newExtension The new extension to use (e.g. "jpg")
   * @returns {string} A filename with the new extension
   */
  setFileExtension: (filename: string, newExtension: string) => string;
}

export const imageConversionService = new ImageConversionService();
