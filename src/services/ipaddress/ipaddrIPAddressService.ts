import ipaddr from 'ipaddr.js';

import type { IIPAddressService } from '.';

export class IpaddrJSIPAddressService implements IIPAddressService {

  public parse(ip: string): Buffer {
    return Buffer.from(ipaddr.parse(ip).toByteArray());
  }

  public stringify(buf: Buffer): string {
    return ipaddr.fromByteArray(Array.from(buf)).toString();
  }
}
