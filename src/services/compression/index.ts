export interface ICompressionService {
  gzip: (buffer: Buffer) => Promise<Buffer>;
  gunzip: (buffer: Buffer) => Promise<Buffer>;
}
