import type { ReadStream } from 'fs';

export type FileStats = {
  size: number;
  lastModified: Date;
  isFile: boolean;
};

export interface IFileService {
  stat: (filePath: string) => Promise<FileStats | false>;
  readFile: (filePath: string) => Promise<Buffer>;
  writeFile: (filePath: string, data: Buffer) => Promise<void>;
  unlink: (filePath: string) => Promise<void>;
  rename: (source: string, dest: string) => Promise<void>;
  /** create a new directory and any parent directories, if needed */
  mkdir: (filePath: string) => Promise<void>;
  rmdir: (filePath: string) => Promise<void>;
  createReadStream: (filePath: string, range?: { start: number; end: number }) => ReadStream;
  // saveReadStream: (readStream: ReadStream, path: string) => Promise<void>;
  /** resolves a relative path and prevents resolving to parent directories */
  safeResolve: (base: string, target: string) => string;
}
