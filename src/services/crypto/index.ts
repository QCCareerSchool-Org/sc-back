export interface ICryptoService {
  /**
   * Returns a cryptographically secure series of bytes
   *
   * @param size the number of bytes
   */
  randomBytes: (size: number) => Promise<Buffer>;

  md5Hash: (buf: Buffer) => string;

  /**
   * Verifies a password against a password hash
   *
   * @param password the password
   * @param passwordHash the password hash
   * @returns true if they match; otherwise false
   */
  verify: (password: string, passwordHash: string) => Promise<boolean>;

  /**
   * Creates a password hash
   *
   * @param password the password
   * @returns the hash
   */
  createHash: (password: string, rounds?: number) => Promise<string>;

  decodeSIN: (buffer: Buffer) => Promise<string>;

  sha256Hmac: (data: Buffer | string, secret: string) => string;

  aes256gcmEncrypt: (plaintext: string) => string;

  aes256gcmDecrypt: (ciphertext: string) => string;
}
