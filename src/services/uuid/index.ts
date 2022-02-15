export interface IUUIDService {
  /** creates a new UUID v1 */
  createUUID: () => string;
  /** rearange bytes for efficient indexing */
  uuidToBin: (uuid: string) => Buffer;
  /** rearange bytes to restore original order */
  binToUUID: (buffer: Buffer) => string;
}
