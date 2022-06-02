export interface IMimeTypeService {
  getTypeFromFile: (path: string) => Promise<string>;
  getTypeFromBuffer: (buffer: Buffer) => Promise<string>;
}
