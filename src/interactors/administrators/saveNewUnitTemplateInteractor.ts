import type { NewUnitTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewUnitTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  data: {
    unitLetter: string;
    title: string | null;
    description: string | null;
    optional: boolean;
    order: number;
  };
};

export type SaveNewUnitTemplateResponseDTO = NewUnitTemplateDTO;

export class SaveNewUnitTemplateNotFound extends Error { }
export class SaveNewUnitTemplateUnitLetterEmpty extends Error { }
export class SaveNewUnitTemplateUnitLetterTooLong extends Error { }
export class SaveNewUnitTemplateInvalidUnitLetter extends Error { }
export class SaveNewUnitTemplateOrderLessThanZero extends Error { }
export class SaveNewUnitTemplateOrderTooLarge extends Error { }
export class SaveNewUnitTemplateUnitLetterAlreadyInUse extends Error { }

export class SaveNewUnitTemplateInteractor implements IInteractor<SaveNewUnitTemplateRequestDTO, SaveNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, data }: SaveNewUnitTemplateRequestDTO): Promise<ResultType<SaveNewUnitTemplateResponseDTO>> {
    try {
      const { unitLetter, title, description, order, optional } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      // find the unit template
      const unit = await this.prisma.newUnitTemplate.findFirst({
        where: { unitId: unitIdBin, course: { courseId, schoolId } },
      });
      if (!unit) {
        return Result.fail(new SaveNewUnitTemplateNotFound());
      }

      // validate the data
      if (unitLetter.length === 0) {
        return Result.fail(new SaveNewUnitTemplateUnitLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return Result.fail(new SaveNewUnitTemplateUnitLetterTooLong());
      }
      if (!/^[a-z0-9]$/iu.test(unitLetter)) {
        return Result.fail(new SaveNewUnitTemplateInvalidUnitLetter());
      }

      if (order < 0) {
        return Result.fail(new SaveNewUnitTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewUnitTemplateOrderTooLarge());
      }

      // update the unit template
      let updatedUnit: NewUnitTemplate;
      try {
        updatedUnit = await this.prisma.newUnitTemplate.update({
          data: {
            unitLetter,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            optional,
          },
          where: { unitId: unitIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_unit_letter') {
            return Result.fail(new SaveNewUnitTemplateUnitLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(updatedUnit.unitId),
        courseId: updatedUnit.courseId,
        unitLetter: updatedUnit.unitLetter,
        title: updatedUnit.title,
        description: updatedUnit.description,
        optional: updatedUnit.optional,
        order: updatedUnit.order,
        created: updatedUnit.created,
        modified: updatedUnit.modified,
      });

    } catch (err) {
      this.logger.error('error saving unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
