import extract from 'extract-zip';

import type { IUnzipService } from '.';

export class ExtractZipUnzipService implements IUnzipService {

  public async extractFiles(zipFile: string, destination: string): Promise<void> {
    return extract(zipFile, { dir: destination });
  }
}
