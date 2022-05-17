/**
 * Service for working with dates
 *
 * Prisma stores and reads dates as UTC even when the MySQL server is set to
 * use a different time zone. So we need to modify dates to account for this
 * mangling. If Prisma fixes this issue, then `mapDateForStorage` and
 * `mapDateFromStorage` can be updated to simply pass the date through.
 */
export interface IDateService {
  getDate: () => Date;
  // /**
  //  * removes the time offset from a date
  //  */
  // mapDateForStorage: (d: Date) => string;
  // /**
  //  * re-adds the time offset to a date
  //  */
  // mapDateFromStorage: <T extends Date | null>(d: T) => T;
}
