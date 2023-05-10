import { jest } from '@jest/globals';
import { DateService } from './dateService.js';

describe('dateService', () => {
  let dateService: DateService;

  beforeEach(() => {
    dateService = new DateService();
  });

  describe('getDate', () => {

    it('should return the current date', () => {
      const mockDate = new Date(1466424490000);
      const dateSpy = jest.spyOn(global, 'Date');
      dateSpy.mockImplementation(() => mockDate);
      expect(dateService.getDate().getTime()).toBe(1466424490000);
    });
  });

  describe('formatDateTime', () => {

    it('formats a date', () => {
      const date = new Date('2022-05-25T10:37:00');
      expect(dateService.formatDateTime(date)).toBe('Wednesday, May 25, 2022 at 10:37:00\u202fAM Eastern Daylight Time');
    });
  });

  describe('fixPrismaReadDate', () => {

    it('shoud offset the date 5 hours', () => {
      const date = new Date(2023, 1, 3, 14, 2, 4); // 2023-06-03T14:02:04
      const fixedDate = dateService.fixPrismaReadDate(date);
      expect(fixedDate.getFullYear()).toBe(2023);
      expect(fixedDate.getMonth()).toBe(1);
      expect(fixedDate.getDate()).toBe(3);
      expect(fixedDate.getHours()).toBe(19);
      expect(fixedDate.getMinutes()).toBe(2);
      expect(fixedDate.getSeconds()).toBe(4);
    });

    it('shoud offset the date 4 hours during DST', () => {
      const date = new Date(2023, 5, 3, 14, 2, 4); // 2023-06-03T14:02:04
      const fixedDate = dateService.fixPrismaReadDate(date);
      expect(fixedDate.getFullYear()).toBe(2023);
      expect(fixedDate.getMonth()).toBe(5);
      expect(fixedDate.getDate()).toBe(3);
      expect(fixedDate.getHours()).toBe(18);
      expect(fixedDate.getMinutes()).toBe(2);
      expect(fixedDate.getSeconds()).toBe(4);
    });
  });

  describe('fixPrismaWriteDate', () => {

    it('shoud offset the date -5 hours', () => {
      const date = new Date(2023, 1, 1, 2, 2, 4); // 2023-01-01T02:02:04
      const fixedDate = dateService.fixPrismaWriteDate(date);
      expect(fixedDate.getFullYear()).toBe(2023);
      expect(fixedDate.getMonth()).toBe(0);
      expect(fixedDate.getDate()).toBe(31);
      expect(fixedDate.getHours()).toBe(21);
      expect(fixedDate.getMinutes()).toBe(2);
      expect(fixedDate.getSeconds()).toBe(4);
    });

    it('shoud offset the date -4 hours during DST', () => {
      const date = new Date(2023, 5, 3, 14, 2, 4); // 2023-06-03T14:02:04
      const fixedDate = dateService.fixPrismaWriteDate(date);
      expect(fixedDate.getFullYear()).toBe(2023);
      expect(fixedDate.getMonth()).toBe(5);
      expect(fixedDate.getDate()).toBe(3);
      expect(fixedDate.getHours()).toBe(10);
      expect(fixedDate.getMinutes()).toBe(2);
      expect(fixedDate.getSeconds()).toBe(4);
    });
  });

  describe('fixPrismaWriteDate and fixPrismaReadDate', () => {

    it('should give back the original date', () => {
      const date = new Date(2023, 1, 14, 18, 32, 1); // 2023-02-14T18:32:01
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date durring DST', () => {
      const date = new Date(2023, 6, 19, 9, 18, 23, 891); // 2023-07-19T09:18:23.891
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date just before the UK\'s DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 26, 1, 59, 4, 392)); // 2023-03-26T01:59:04.392 UTC
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date right after the UK\'s DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 26, 2, 0, 8, 834)); // 2023-03-26T02:00:08.834 UTC
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date just after an hour after the UK\'s DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 26, 3, 0, 18, 834)); // 2023-03-26T03:00:18.834 UTC
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date just before our DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 12, 6, 59, 4, 392)); // 2023-03-12T06:59:04.392 UTC (01:59:04 local time)
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date right after our DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 12, 7, 0, 8, 834)); // 2023-03-12T07:00:08.834 UTC (02:00:08 / 03:00:08 local time)
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });

    it('should give back the original date just after an hour after our DST change', () => {
      const date = new Date(Date.UTC(2023, 2, 12, 8, 0, 18, 834)); // 2023-03-12T08:00:18.834 UTC (04:00:18 local time)
      const fixedDate = dateService.fixPrismaReadDate(dateService.fixPrismaWriteDate(date));
      expect(fixedDate.getTime()).toBe(date.getTime());
    });
  });
});
