import { parse, toSeconds } from 'iso8601-duration';
import type { IIntervalService } from './index.js';

export class IntervalService implements IIntervalService {

  public parse(interval: string): number {
    return toSeconds(parse(interval)) * 1000;
  }

  public format(ms: number): string {
    return `PT${Math.round(ms) / 1000}S`;
  }
}
