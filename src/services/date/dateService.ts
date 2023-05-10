import type { IDateService } from './index.js';

export class DateService implements IDateService {
  private static readonly months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];

  public getDate(): Date {
    return new Date();
  }

  public getLocalDate(date?: Date): string {
    const d = date ?? new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  public fixPrismaReadDate(d: Date): Date;
  public fixPrismaReadDate(d: null): null;
  public fixPrismaReadDate(d: Date | null): Date | null;
  public fixPrismaReadDate(d: Date | null): Date | null {
    if (d === null) { return null; }
    return new Date(`${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}T${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}.${d.getUTCMilliseconds().toString().padStart(2, '0')}`);
  }

  public fixPrismaWriteDate(d: Date): Date;
  public fixPrismaWriteDate(d: null): null;
  public fixPrismaWriteDate(d: Date | null): Date | null;
  public fixPrismaWriteDate(d: Date | null): Date | null {
    if (d === null) { return null; }
    return new Date(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}.${d.getMilliseconds().toString().padStart(2, '0')}Z`);
  }

  public formatDateTime(date: Date): string {
    return date.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'full' });
  }
}
