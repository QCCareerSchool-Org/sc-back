import { jest } from '@jest/globals';
import type { SpyInstance } from 'jest-mock';
import { DateService } from './dateService.js';

describe('dateService', () => {
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
  });

  describe('getDate', () => {

    it('should return the current date', () => {
      const mockDate = new Date(1466424490000);
      const dateSpy = jest.spyOn(global, 'Date') as SpyInstance<unknown, []> as SpyInstance<Date, []>;
      dateSpy.mockImplementation(() => mockDate);
      expect(dateService.getDate().getTime()).toBe(1466424490000);
    });
  });

  describe('formatDateTime', () => {

    it('formats a date', () => {
      const date = new Date('2022-05-25T10:37:00');
      expect(dateService.formatDateTime(date)).toBe('Wednesday, May 25, 2022 at 10:37:00 AM Eastern Daylight Time');
    });
  });
});
