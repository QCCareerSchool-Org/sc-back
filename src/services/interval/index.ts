export interface IIntervalService {
  parse: (interval: string) => number;
  format: (ms: number) => string;
}
