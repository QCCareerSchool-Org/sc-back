export interface IShuffleService {
  /** performs an in-place shuffle and returns the shuffled array */
  shuffle: <T>(array: T[]) => T[];
}
