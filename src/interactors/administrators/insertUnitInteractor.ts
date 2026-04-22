import type { PrismaClient, Unit } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';

export type InsertUnitRequestDTO = {
  courseId: number;
  unitLetter: string;
  title: string | null;
  order: number;
  privileges?: Privileges;
};

export type InsertUnitResponseDTO = UnitDTO;

abstract class InsertUnitError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class InsertUnitCourseNotFound extends InsertUnitError { }
export class InsertUnitIncorrectSubmissionType extends InsertUnitError { }
export class InsertUnitTitleEmpty extends InsertUnitError { }
export class InsertUnitTitleTooLong extends InsertUnitError { }
export class InsertUnitUnitLetterEmpty extends InsertUnitError { }
export class InsertUnitUnitLetterTooLong extends InsertUnitError { }
export class InsertUnitOrderLessThanZero extends InsertUnitError { }
export class InsertUnitOrderTooLarge extends InsertUnitError { }
export class InsertUnitUnitLetterAlreadyExists extends InsertUnitError { }

export class InsertUnitInteractor implements IInteractor<InsertUnitRequestDTO, InsertUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertUnitRequestDTO): Promise<ResultType<InsertUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return failure(new InsufficientPrivileges());
      }

      // find the course
      const course = await this.prisma.course.findUnique({ where: { courseId: request.courseId } });
      if (!course) {
        return failure(new InsertUnitCourseNotFound());
      }

      if (course.submissionType !== 1) {
        return failure(new InsertUnitIncorrectSubmissionType());
      }

      if (request.title !== null) {
        if (request.title.length === 0) {
          return failure(new InsertUnitTitleEmpty());
        }
        if ([ ...request.title ].length > 255) {
          return failure(new InsertUnitTitleTooLong());
        }
      }

      if (request.unitLetter.length === 0) {
        return failure(new InsertUnitUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return failure(new InsertUnitUnitLetterTooLong());
      }

      if (request.order < 0) {
        return failure(new InsertUnitOrderLessThanZero());
      }
      if (request.order > 127) {
        return failure(new InsertUnitOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      let insertedUnit: Unit;
      try {
        insertedUnit = await this.prisma.unit.create({
          data: {
            unitId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            courseId: request.courseId,
            unitLetter: request.unitLetter,
            title: request.title,
            order: request.order,
            created: prismaNow,
            modified: prismaNow,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta?.target === 'course_id_unit_letter') {
          return failure(new InsertUnitUnitLetterAlreadyExists());
        }
        throw err;
      }

      return success({
        unitId: this.uuidService.binToUUID(insertedUnit.unitId),
        courseId: insertedUnit.courseId,
        unitLetter: insertedUnit.unitLetter,
        title: insertedUnit.title,
        order: insertedUnit.order,
        created: this.dateService.fixPrismaReadDate(insertedUnit.created),
        modified: this.dateService.fixPrismaReadDate(insertedUnit.modified),
      });

    } catch (err) {
      this.logger.error('error inserting unit', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
