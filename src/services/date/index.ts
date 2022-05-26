/**
 * Service for working with dates
 */
export interface IDateService {
  getDate: () => Date;
  formatDateTime: (date: Date) => string;
}
