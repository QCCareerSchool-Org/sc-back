import type { PrismaClient } from '@prisma/client';

import type { Privileges } from '../../domain/accessTokenPayload.js';
import type { NewMaterialUnitDTO } from '../../domain/newMaterialUnitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { InsufficientPrivileges } from '../index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewMaterialUnitRequestDTO = {
  courseId: number;
  unitLetter: string;
  title: string | null;
  order: number;
  privileges?: Privileges;
};

export type InsertNewMaterialUnitResponseDTO = NewMaterialUnitDTO;

abstract class InsertNewMaterialUnitError extends Error { }

export class InsertNewMaterialUnitCourseNotFound extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitIncorrectUnitType extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitTitleEmpty extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitTitleTooLong extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitDescriptionEmpty extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitDescriptionTooLong extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitUnitLetterEmpty extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitUnitLetterTooLong extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitOrderLessThanZero extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitOrderTooLarge extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitInvalidType extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitExternalDataPresent extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitExternalDataMissing extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitFilePresent extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitFileMissing extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitFileTooLarge extends InsertNewMaterialUnitError {
  public constructor(public readonly maxSize: number, public readonly actualSize: number) { super(); }
}
export class InsertNewMaterialUnitInvalidMimeType extends InsertNewMaterialUnitError {
  public constructor(public readonly mimeType: string) { super(); }
}
export class InsertNewMaterialUnitFileSaveError extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitCouldNotFetchExternalData extends InsertNewMaterialUnitError { }
export class InsertNewMaterialUnitContentTypeMissing extends InsertNewMaterialUnitError { }

export class InsertNewMaterialUnitInteractor implements IInteractor<InsertNewMaterialUnitRequestDTO, InsertNewMaterialUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewMaterialUnitRequestDTO): Promise<ResultType<InsertNewMaterialUnitResponseDTO>> {
    try {
      if (!request.privileges?.courseDevelopment) {
        return Result.fail(new InsufficientPrivileges());
      }

      // find the course
      const course = await this.prisma.course.findUnique({ where: { courseId: request.courseId } });
      if (!course) {
        return Result.fail(new InsertNewMaterialUnitCourseNotFound());
      }

      if (course.unitType !== 1) {
        return Result.fail(new InsertNewMaterialUnitIncorrectUnitType());
      }

      if (request.title !== null) {
        if (request.title.length === 0) {
          return Result.fail(new InsertNewMaterialUnitTitleEmpty());
        }
        if ([ ...request.title ].length > 255) {
          return Result.fail(new InsertNewMaterialUnitTitleTooLong());
        }
      }

      if (request.unitLetter.length === 0) {
        return Result.fail(new InsertNewMaterialUnitUnitLetterEmpty());
      }
      if ([ ...request.unitLetter ].length > 1) {
        return Result.fail(new InsertNewMaterialUnitUnitLetterTooLong());
      }

      if (request.order < 0) {
        return Result.fail(new InsertNewMaterialUnitOrderLessThanZero());
      }
      if (request.order > 127) {
        return Result.fail(new InsertNewMaterialUnitOrderTooLarge());
      }

      const insertedMaterialUnit = await this.prisma.newMaterialUnit.create({
        data: {
          materialUnitId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          courseId: request.courseId,
          unitLetter: request.unitLetter,
          title: request.title,
          order: request.order,
        },
      });

      return Result.success({
        materialUnitId: this.uuidService.binToUUID(insertedMaterialUnit.materialUnitId),
        courseId: insertedMaterialUnit.courseId,
        unitLetter: insertedMaterialUnit.unitLetter,
        title: insertedMaterialUnit.title,
        order: insertedMaterialUnit.order,
      });

    } catch (err) {
      this.logger.error('error inserting new material unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
