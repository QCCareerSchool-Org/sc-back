import faker from '@faker-js/faker';
import type { Course, NewUnitTemplate, PrismaClient, School } from '@prisma/client';
import type { ILoggerService } from '../../../services/logger';
import type { IUUIDService } from '../../../services/uuid';
import { UUIDService } from '../../../services/uuid/uuidService';
import { isErrorResult, isSuccessResult } from '../../result';
import { GetCourseInteractor, GetCourseNotFound } from '../getCourseInteractor';

type MockPrismaClient = {
  course: {
    findFirst: jest.Mock;
  };
};

type MockLogger = {
  error: jest.Mock;
};

describe('GetCourseInteractor', () => {

  let mockPrisma: MockPrismaClient;
  let uuidService: IUUIDService;
  let mockLogger: MockLogger;

  let interactor: GetCourseInteractor;
  let schoolId: number;
  let courseId: number;

  let course: Course & { school: School; newUnits: NewUnitTemplate[] };

  beforeEach(() => {
    mockPrisma = {
      course: {
        findFirst: jest.fn(() => {
          return null;
        }),
      },
    };

    uuidService = new UUIDService();

    mockLogger = {
      error: jest.fn(() => { /* */ }),
    };

    interactor = new GetCourseInteractor(mockPrisma as unknown as PrismaClient, uuidService, mockLogger as unknown as ILoggerService);
    schoolId = 4;
    courseId = 1;

    course = {
      courseId: faker.datatype.number(),
      schoolId: faker.datatype.number(),
      code: faker.random.alphaNumeric(2),
      version: faker.datatype.number(),
      studentTypeId: faker.random.arrayElement([ 'general', 'writing', 'design ' ]),
      name: faker.random.words(3),
      courseGuide: faker.datatype.boolean(),
      quizzesEnabled: faker.datatype.boolean(),
      noTutor: faker.datatype.boolean(),
      unitType: faker.datatype.number(),
      enabled: faker.datatype.boolean(),
      order: faker.datatype.number(),
      newUnitsEnabled: faker.datatype.boolean(),
      entityVersion: faker.datatype.number(),
      school: {
        schoolId: faker.datatype.number(),
        name: faker.random.words(3),
        slug: faker.random.word(),
        order: faker.datatype.number(),
        entityVersion: faker.datatype.number(),
      },
      newUnits: new Array(faker.datatype.number({ min: 1, max: 4 })).fill(undefined).map(() => ({
        unitTemplateId: Buffer.from(new Array(16).fill(undefined).map(() => faker.datatype.number({ min: 0, max: 255 }))),
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
      })),
    };
  });

  describe('when the course exists', () => {
    it('should return a CourseDTO', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(course);
      const result = await interactor.execute({ schoolId, courseId });
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      if (!isSuccessResult(result)) { throw Error(); } // for narrowing
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
        unitType: course.unitType,
        enabled: course.enabled,
        order: course.order,
        newUnitsEnabled: course.newUnitsEnabled,
        entityVersion: course.entityVersion,
        school: {
          schoolId: course.school.schoolId,
          name: course.school.name,
          slug: course.school.slug,
          order: course.school.order,
          entityVersion: course.school.entityVersion,
        },
        newUnitTemplates: course.newUnits.map(u => ({
          unitTemplateId: uuidService.binToUUID(u.unitTemplateId),
          courseId: u.courseId,
          unitLetter: u.unitLetter,
          title: u.title,
          description: u.description,
          markingCriteria: u.markingCriteria,
          optional: u.optional,
          order: u.order,
          enabled: u.enabled,
          created: u.created,
          modified: u.modified,
        })),
      });
    });
  });

  describe('when the course doesn\'t exist', () => {
    it('should return an error', async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);
      const result = await interactor.execute({ schoolId, courseId });
      expect(result).toBeDefined();
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
      const result = await interactor.execute({ schoolId, courseId });
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
      const result = await interactor.execute({ schoolId, courseId });
      expect(mockLogger.error).toHaveBeenCalledWith('error getting course', errorMessage);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      if (!isErrorResult(result)) { throw Error(); } // for narrowing
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('unknown error');
    });
  });
});
