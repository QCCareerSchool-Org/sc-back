import type { IDateService } from './index.js';

export class DateService implements IDateService {
  private static readonly months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

  public getDate(): Date {
    return new Date();
  }

  public getLocalDate(): string {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  public formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'full' });
  }
}
