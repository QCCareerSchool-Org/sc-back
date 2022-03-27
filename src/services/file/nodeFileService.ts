import type { ReadStream } from 'fs';
import fs from 'fs';
import path from 'path';

import type { FileStats, IFileService } from '.';

export class NodeFileService implements IFileService {

  public async stat(filePath: string): Promise<FileStats | false> {
    try {
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error: unknown) {
      return false;
    }
  }

  public async readFile(filePath: string): Promise<Buffer> {
    return fs.promises.readFile(filePath);
  }

  public async writeFile(filePath: string, data: Buffer): Promise<void> {
    return fs.promises.writeFile(filePath, data);
  }

  public async unlink(filePath: string): Promise<void> {
    return fs.promises.unlink(filePath);
  }

  public async rename(source: string, dest: string): Promise<void> {
    return fs.promises.rename(source, dest);
  }

  public async mkdir(filePath: string): Promise<void> {
    if (await this.stat(filePath)) {
      return;
    }
    const basePath = path.dirname(filePath);
    await this.mkdir(basePath);
    return fs.promises.mkdir(filePath);
  }

  public createReadStream(filePath: string, range?: { start: number; end: number }): ReadStream {
    return fs.createReadStream(filePath, range);
  }

  // public saveReadStream(readStream: ReadStream, path: string): Promise<void> {
  //   return new Promise((resolve, reject) => {
  //     const writeStream = fs.createWriteStream(path);
  //     readStream.pipe(writeStream);
  //     writeStream.on('finish', () => {
  //       resolve();
  //     });
  //     writeStream.on('error', err => {
  //       reject(err);
  //     });
  //   });
  // }
}
