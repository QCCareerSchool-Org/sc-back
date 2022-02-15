import { IDateService } from '.';

export class DateService implements IDateService {

  public getDate(): Date {
    return new Date();
  }
}
