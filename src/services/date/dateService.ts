import type { IDateService } from '.';

export class DateService implements IDateService {

  public getDate(): Date {
    return new Date();
  }

  public mapDateForStorage(d: Date): string {
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}T${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}+00:00`;
  }

  public mapDateFromStorage<T extends Date | null>(d: T): T {
    if (d === null) {
      return d;
    }
    return new Date(`${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, '0')}-${d.getUTCDate().toString().padStart(2, '0')}T${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}`) as T;
  }
}
