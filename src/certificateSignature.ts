import { createCipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
if (!process.env.ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}

const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

const encrypt = (plaintext: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();
  return Buffer.concat([ iv, authTag, encrypted ]).toString('base64url');
};

console.log(encrypt('50:101'));
