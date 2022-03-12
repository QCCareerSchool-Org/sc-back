import type { ReadStream } from 'fs';

export type FileStats = {
  size: number;
  lastModified: Date;
};

export interface IFileService {
  stat: (filePath: string) => Promise<FileStats | false>;
  readFile: (filePath: string) => Promise<Buffer>;
  writeFile: (filePath: string, data: Buffer) => Promise<void>;
  unlink: (filePath: string) => Promise<void>;
  rename: (source: string, dest: string) => Promise<void>;
  mkdir: (filePath: string) => Promise<void>;
  createReadStream: (filePath: string) => ReadStream;
  // saveReadStream: (readStream: ReadStream, path: string) => Promise<void>;
}
