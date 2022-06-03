import { faker } from '@faker-js/faker';
import { jest } from '@jest/globals';
import type { UUIDService as UUIDSerivceClass } from './uuidService.js';

jest.unstable_mockModule('uuid', () => ({
  v1: jest.fn(),
}));

const { v1 } = await import('uuid');
const { UUIDService } = await import('./uuidService.js');

describe('UUIDSerivce', () => {
  let uuidService: UUIDSerivceClass;

  beforeEach(() => {
    uuidService = new UUIDService();
  });

  describe('createUUID', () => {

    it('should call v1 from the uuid library and return the result', () => {
      const uuid = faker.datatype.uuid();
      (v1 as jest.Mock).mockReturnValue(uuid);
      expect(uuidService.createUUID()).toBe(uuid);
      expect(v1).toHaveBeenCalled();
    });
  });

  describe('uuidToBin', () => {

    it('should return a Buffer of length 16', () => {
      const uuid = faker.datatype.uuid();
      const buffer = uuidService.uuidToBin(uuid);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer).toHaveLength(16);
    });

    it('should rearrange the bytes for optimal database indexing', () => {
      const uuid = '02468ace-1122-3344-5566-778899aabbcc';
      // swap to   '3344-1122-02468ace-5566-778899aabbcc'
      const buffer = uuidService.uuidToBin(uuid);
      expect(buffer).toEqual(Buffer.from([ 51, 68, 17, 34, 2, 70, 138, 206, 85, 102, 119, 136, 153, 170, 187, 204 ]));
    });

    it('should throw if the uuid is not the right length', () => {
      const uuid = '0423ab498e98b9a8c';
      expect(() => uuidService.uuidToBin(uuid)).toThrow('Invalid uuid length');
    });

    it('should throw if the uuid is invalid', () => {
      const uuid1 = '3344-11a2-02468ace-5566-778899aabbcc'; // hyphens in wrong spot
      expect(() => uuidService.uuidToBin(uuid1)).toThrow('Invalid uuid format');
      const uuid2 = 'z2468ace-1122-3344-5566-778899aabbcc'; // invalid character
      expect(() => uuidService.uuidToBin(uuid2)).toThrow('Invalid uuid format');
    });
  });

  describe('binToUUID', () => {

    it('should return a string', () => {
      // const array = Array(16).fill(undefined).map(() => faker.datatype.number({ min: 0, max: 255 }));
      const array = Array(16).fill(undefined).map(() => Math.floor(Math.random() * 256));
      const buffer = Buffer.from(array);
      const uuid = uuidService.binToUUID(buffer);
      expect(typeof uuid).toBe('string');
    });

    it('should rearrange the bytes back into their original order', () => {
      const buffer = Buffer.from([ 51, 68, 17, 34, 2, 70, 138, 206, 85, 102, 119, 136, 153, 170, 187, 204 ]);
      const uuid = uuidService.binToUUID(buffer);
      expect(uuid).toBe('02468ace-1122-3344-5566-778899aabbcc');
    });

    it('should throw if the buffer length is not 16', () => {
      const buffer = Buffer.from([ 3, 4, 92 ]);
      expect(() => uuidService.binToUUID(buffer)).toThrow('Invalid buffer length');
    });
  });
});
