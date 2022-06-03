import { faker } from '@faker-js/faker';

import { FisherYatesShuffleService } from './fisherYatesShuffleService.js';

describe('FisherYatesShuffleService', () => {
  let fisherYatesShuffleService: FisherYatesShuffleService;

  beforeEach(() => {
    fisherYatesShuffleService = new FisherYatesShuffleService();
  });

  describe('shuffle', () => {

    it('should keep the same number of elements and each element should still exist in the list', () => {
      const length = faker.datatype.number({ min: 5, max: 25 });
      const original = Array(length).fill(undefined).map(() => faker.random.word());
      const shuffled = fisherYatesShuffleService.shuffle(original);
      expect(shuffled).toHaveLength(length);
      for (const i of original) {
        expect(shuffled).toContain(i);
      }
    });
  });
});
