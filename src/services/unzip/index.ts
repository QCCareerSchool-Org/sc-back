export interface IUnzipService {
  extractFiles: (zipFile: string, destination: string) => Promise<void>;
}
