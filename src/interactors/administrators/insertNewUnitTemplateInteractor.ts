import type { PrismaClient } from '@prisma/client';
import { v1 } from 'uuid';

import type { IInteractor } from '..';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InsertNewUnitTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  data: {
    unitLetter: string;
    title: string | null;
    description: string | null;
    optional: boolean;
    order: number;
  };
};

export type InsertNewUnitTemplateResponseDTO = NewUnitTemplateDTO;

export class InsertNewUnitTemplateCourseNotFound extends Error { }
export class InsertNewUnitTemplateUnitLetterEmpty extends Error { }
export class InsertNewUnitTemplateUnitLetterTooLong extends Error { }
export class InsertNewUnitTemplateInvalidUnitLetter extends Error { }
export class InsertNewUnitTemplateOrderLessThanZero extends Error { }
export class InsertNewUnitTemplateOrderTooLarge extends Error { }

export class InsertNewUnitTemplateInteractor implements IInteractor<InsertNewUnitTemplateRequestDTO, InsertNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewUnitTemplateRequestDTO): Promise<ResultType<InsertNewUnitTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { unitLetter, title, description, optional, order } = request.data;

      // find the course
      const course = await this.prisma.course.findFirst({
        where: { courseId, schoolId },
      });
      if (!course) {
        return Result.fail(new InsertNewUnitTemplateCourseNotFound());
      }

      if (unitLetter.length === 0) {
        return Result.fail(new InsertNewUnitTemplateUnitLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return Result.fail(new InsertNewUnitTemplateUnitLetterTooLong());
      }
      if (!/^[a-z]$/iu.test(unitLetter)) {
        return Result.fail(new InsertNewUnitTemplateInvalidUnitLetter());
      }

      if (order < 0) {
        return Result.fail(new InsertNewUnitTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewUnitTemplateOrderTooLarge());
      }

      // insert the unit
      const insertedUnit = await this.prisma.newUnitTemplate.create({
        data: {
          unitId: this.uuidService.uuidToBin(v1()),
          courseId,
          unitLetter,
          title: title?.length ? title : null,
          description: description?.length ? description : null,
          optional,
          order,
        },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(insertedUnit.unitId),
        courseId: insertedUnit.courseId,
        unitLetter: insertedUnit.unitLetter,
        title: insertedUnit.title,
        description: insertedUnit.description,
        optional: insertedUnit.optional,
        order: insertedUnit.order,
        created: insertedUnit.created,
        modified: insertedUnit.modified,
      });

    } catch (err) {
      this.logger.error('error inserting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
