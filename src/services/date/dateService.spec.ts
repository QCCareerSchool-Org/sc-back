import { DateService } from './dateService.js';

describe('dateService', () => {
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
  });

  describe('getDate', () => {

    it('should return the current date', () => {
      const now = new Date().getTime();
      expect(dateService.getDate().getTime()).toBeGreaterThan(now - 10);
      expect(dateService.getDate().getTime()).toBeLessThan(now + 10);
    });
  });

  describe('formatDateTime', () => {

    it('formats a date', () => {
      const date = new Date('2022-05-25T10:37:00');
      expect(dateService.formatDateTime(date)).toBe('Wednesday, May 25, 2022 at 10:37:00 AM Eastern Daylight Time');
    });
  });
});
