import type { IDateService } from './index.js';

export class DateService implements IDateService {
  private static readonly months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

  public getDate(): Date {
    return new Date();
  }

  public formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'full' });
  }
}
