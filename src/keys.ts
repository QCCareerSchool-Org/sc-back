import fs from 'fs';
import path from 'path';

export const privateKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.key')).toString();
export const publicKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.pub.key')).toString();
