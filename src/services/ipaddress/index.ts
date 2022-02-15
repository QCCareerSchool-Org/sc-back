export interface IIPAddressService {
  parse: (ip: string) => Buffer;
  stringify: (buf: Buffer) => string;
}
