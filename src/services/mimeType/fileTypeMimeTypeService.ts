import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';

import type { IMimeTypeService } from './index.js';

export class FileTypeMimeTypeService implements IMimeTypeService {

  public async getTypeFromBuffer(buffer: Buffer): Promise<string> {
    const result = await fileTypeFromBuffer(buffer);
    if (result) {
      return result.mime;
    }
    return 'application/octet-stream';
  }

  public async getTypeFromFile(path: string): Promise<string> {
    const result = await fileTypeFromFile(path);
    if (result) {
      return result.mime;
    }
    return 'application/octet-stream';
  }
}
