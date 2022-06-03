import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const privateKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.key')).toString();
export const publicKey = fs.readFileSync(path.join(__dirname, '../jwtRS256.pub.key')).toString();
