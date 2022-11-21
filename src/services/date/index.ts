/**
 * Service for working with dates
 */
export interface IDateService {
  getDate: () => Date;
  getLocalDate: () => string;
  formatDateTime: (date: Date) => string;
}
