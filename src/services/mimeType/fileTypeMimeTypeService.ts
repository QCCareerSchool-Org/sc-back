import { fileTypeFromBuffer, fileTypeFromFile } from 'file-type';

// import type { IMimeTypeService } from '.';

export class FileTypeMimeTypeService {

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
