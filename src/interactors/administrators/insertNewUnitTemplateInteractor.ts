import type { NewUnitTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

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
export class InsertNewUnitTemplateUnitsEnabled extends Error { }
export class InsertNewUnitTemplateUnitLetterEmpty extends Error { }
export class InsertNewUnitTemplateUnitLetterTooLong extends Error { }
export class InsertNewUnitTemplateInvalidUnitLetter extends Error { }
export class InsertNewUnitTemplateOrderLessThanZero extends Error { }
export class InsertNewUnitTemplateOrderTooLarge extends Error { }
export class InsertNewUnitTemplateUnitLetterAlreadyInUse extends Error { }

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

      if (course.newUnitsEnabled) {
        return Result.fail(new InsertNewUnitTemplateUnitsEnabled());
      }

      // validate the data
      if (unitLetter.length === 0) {
        return Result.fail(new InsertNewUnitTemplateUnitLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return Result.fail(new InsertNewUnitTemplateUnitLetterTooLong());
      }
      if (!/^[a-z0-9]$/iu.test(unitLetter)) {
        return Result.fail(new InsertNewUnitTemplateInvalidUnitLetter());
      }

      if (order < 0) {
        return Result.fail(new InsertNewUnitTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewUnitTemplateOrderTooLarge());
      }

      // insert the unit template
      let insertedUnitTemplate: NewUnitTemplate;
      try {
        insertedUnitTemplate = await this.prisma.newUnitTemplate.create({
          data: {
            unitTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            courseId,
            unitLetter,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            order,
            optional,
          },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_unit_letter') {
            return Result.fail(new InsertNewUnitTemplateUnitLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        unitTemplateId: this.uuidService.binToUUID(insertedUnitTemplate.unitTemplateId),
        courseId: insertedUnitTemplate.courseId,
        unitLetter: insertedUnitTemplate.unitLetter,
        title: insertedUnitTemplate.title,
        description: insertedUnitTemplate.description,
        optional: insertedUnitTemplate.optional,
        order: insertedUnitTemplate.order,
        enabled: insertedUnitTemplate.enabled,
        created: insertedUnitTemplate.created,
        modified: insertedUnitTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error inserting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
