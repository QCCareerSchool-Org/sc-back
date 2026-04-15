import { faker } from '@faker-js/faker';
import { describe, it, jest } from '@jest/globals';
import type { Course, Currency, Material, NewSubmissionTemplate, NewSubmissionTemplatePrice, PrismaClient, School, Unit } from '@prisma/client';
import { isErrorResult, isSuccessResult } from 'generic-result-type';

import type { ILoggerService } from '../../../services/logger/index.js';
import type { IUUIDService } from '../../../services/uuid/index.js';
import { UUIDService } from '../../../services/uuid/uuidService.js';
import { GetCourseInteractor, GetCourseNotFound } from '../getCourseInteractor.js';

type PrismaCourseResult = Course & {
  school: School;
  newSubmissionTemplates: Array<NewSubmissionTemplate & {
    prices: Array<NewSubmissionTemplatePrice & { currency: Currency }>;
  }>;
  units: Array<Unit & {
    materials: Material;
  }>;
};

type MockPrismaClient = {
  course: {
    findFirst: jest.Mock<() => Promise<PrismaCourseResult | null>>;
  };
};

describe('GetCourseInteractor', () => {

  let mockPrisma: MockPrismaClient;
  let uuidService: IUUIDService;
  let mockLogger: ILoggerService;

  let interactor: GetCourseInteractor;
  let courseId: number;

  let course: PrismaCourseResult;

  beforeEach(() => {
    mockPrisma = {
      course: {
        findFirst: jest.fn(async () => Promise.resolve(null)),
      },
    };

    uuidService = new UUIDService();

    mockLogger = {
      error: jest.fn(() => { /* */ }),
      warn: jest.fn(() => { /* */ }),
      info: jest.fn(() => { /* */ }),
    };

    interactor = new GetCourseInteractor(mockPrisma as unknown as PrismaClient, uuidService, mockLogger as unknown as ILoggerService);
    courseId = 1;

    course = {
      courseId: faker.datatype.number(),
      schoolId: faker.datatype.number(),
      code: faker.random.alphaNumeric(2),
      version: faker.datatype.number(),
      studentTypeId: faker.helpers.arrayElement([ 'general', 'writing', 'design ' ]),
      name: faker.random.words(3),
      courseGuide: faker.datatype.boolean(),
      quizzesEnabled: faker.datatype.boolean(),
      noTutor: faker.datatype.boolean(),
      submissionType: faker.datatype.number(),
      enabled: faker.datatype.boolean(),
      order: faker.datatype.number(),
      submissionsEnabled: faker.datatype.boolean(),
      entityVersion: faker.datatype.number(),
      school: {
        schoolId: faker.datatype.number(),
        name: faker.random.words(3),
        slug: faker.random.word(),
        order: faker.datatype.number(),
        entityVersion: faker.datatype.number(),
      },
      newSubmissionTemplates: new Array(faker.datatype.number({ min: 1, max: 4 })).fill(undefined).map(() => ({
        submissionTemplateId: Buffer.from(new Array(16).fill(undefined).map(() => faker.datatype.number({ min: 0, max: 255 }))),
        courseId: faker.datatype.number(),
        unitLetter: faker.random.alphaNumeric(1),
        title: faker.random.words(3),
        description: faker.random.words(42),
        markingCriteria: null,
        optional: faker.datatype.boolean(),
        order: faker.datatype.number(),
        enabled: faker.datatype.boolean(),
        created: faker.datatype.datetime(),
        modified: null,
        prices: [],
      })),
      units: [],
    };
  });

  describe('when the course exists', () => {
    it('should return a CourseDTO', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(course);
      const result = await interactor.execute({ courseId });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      if (!isSuccessResult(result)) { throw result.error; } // for narrowing
      expect(result.value).toEqual({
        courseId: course.courseId,
        schoolId: course.schoolId,
        code: course.code,
        version: course.version,
        studentTypeId: course.studentTypeId,
        name: course.name,
        courseGuide: course.courseGuide,
        quizzesEnabled: course.quizzesEnabled,
        noTutor: course.noTutor,
        submissionType: course.submissionType,
        enabled: course.enabled,
        order: course.order,
        submissionsEnabled: course.submissionsEnabled,
        entityVersion: course.entityVersion,
        school: {
          schoolId: course.school.schoolId,
          name: course.school.name,
          slug: course.school.slug,
          order: course.school.order,
          entityVersion: course.school.entityVersion,
        },
        newSubmissionTemplates: course.newSubmissionTemplates.map(u => ({
          submissionTemplateId: uuidService.binToUUID(u.submissionTemplateId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          description: u.description,
          markingCriteria: u.markingCriteria,
          optional: u.optional,
          order: u.order,
          created: u.created,
          modified: u.modified,
          prices: u.prices.map(p => ({
            unitTemplatePriceId: uuidService.binToUUID(p.submissionTemplatePriceId),
            unitTemplateId: uuidService.binToUUID(p.submissionTemplateId),
            countryId: p.countryId,
            currencyId: p.currencyId,
            price: p.price.toNumber(),
            created: p.created,
            modified: p.modified,
            currency: {
              currencyId: p.currency.currencyId,
              code: p.currency.code,
              name: p.currency.name,
              symbol: p.currency.symbol,
            },
          })),
        })),
        units: [],
      });
    });
  });

  describe('when the course doesn\'t exist', () => {
    it('should return an error', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);
      const result = await interactor.execute({ courseId });
      expect(result.success).toBe(false);
      if (!isErrorResult(result)) { throw Error(); } // for narrowing
      expect(result.error).toBeInstanceOf(GetCourseNotFound);
    });
  });

  describe('when an error is thrown', () => {
    it('should log and return the error', async () => {
      class CustomError extends Error {}
      const errorMessage = faker.random.words(3);
      const customError = new CustomError(errorMessage);
      mockPrisma.course.findFirst.mockRejectedValue(customError);
      const result = await interactor.execute({ courseId });
      expect(mockLogger.error).toHaveBeenCalledWith('error getting course', errorMessage);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      if (!isErrorResult(result)) { throw Error(); } // for narrowing
      expect(result.error).toBe(customError);
    });
  });

  describe('when a non-error is thrown', () => {
    it('should log and return an error', async () => {
      const errorMessage = faker.random.words(3);
      mockPrisma.course.findFirst.mockRejectedValue(errorMessage);
      const result = await interactor.execute({ courseId });
      expect(mockLogger.error).toHaveBeenCalledWith('error getting course', errorMessage);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      if (!isErrorResult(result)) { throw Error(); } // for narrowing
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('unknown error');
    });
  });
});
