import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

export const encrypt = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return Buffer.concat([ iv, authTag, encrypted ]).toString('base64url');
};

export const decrypt = (ciphertext: string): string => {
  const buf = Buffer.from(ciphertext, 'base64url');

  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(12, 28); // 16 bytes
  const encrypted = buf.subarray(28);

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
};
