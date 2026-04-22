import type { Logger } from 'winston';

import type { ILoggerService } from './index.js';

export class WinstonLoggerService implements ILoggerService {

  public constructor(private readonly winston: Logger) { /* empty */ }

  public error(message: string, ...meta: unknown[]): void {
    this.winston.error(message, meta);
  }

  public warn(message: string, ...meta: unknown[]): void {
    this.winston.warn(message, meta);
  }

  public info(message: string, ...meta: unknown[]): void {
    this.winston.info(message, meta);
  }
}
