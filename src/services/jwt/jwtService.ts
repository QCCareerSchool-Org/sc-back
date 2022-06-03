import jwt from 'jsonwebtoken';

import type { IJWTService } from './index.js';

export class JWTService implements IJWTService {
  private readonly jwtSecret: jwt.Secret;

  public constructor(privateKey: string, private readonly publicKey: string) {
    this.jwtSecret = {
      key: privateKey,
      passphrase: 'CoUrSe123',
    };
  }

  public async sign(payload: string | Record<string, unknown> | Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      jwt.sign(payload, this.jwtSecret, { algorithm: 'RS256' }, (err, token) => {
        if (err) {
          reject(err);
        } else if (typeof token === 'undefined') {
          reject(new Error('token is undefined'));
        } else {
          resolve(token);
        }
      });
    });
  }

  public async verify(token: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, this.publicKey, (err, payload) => {
        if (err) {
          reject(err);
        } else {
          resolve(payload);
        }
      });
    });
  }
}
