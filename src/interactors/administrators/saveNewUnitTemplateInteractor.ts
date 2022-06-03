import type { NewUnitTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';

import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveNewUnitTemplateRequestDTO = {
  unitId: string;
  unitLetter: string;
  title: string | null;
  description: string | null;
  markingCriteria: string | null;
  optional: boolean;
  order: number;
};

export type SaveNewUnitTemplateResponseDTO = NewUnitTemplateDTO;

export class SaveNewUnitTemplateNotFound extends Error { }
export class SaveNewUnitTemplateUnitsEnabled extends Error { }
export class SaveNewUnitTemplateUnitLetterEmpty extends Error { }
export class SaveNewUnitTemplateUnitLetterTooLong extends Error { }
export class SaveNewUnitTemplateInvalidUnitLetter extends Error { }
export class SaveNewUnitTemplateTitleTooLong extends Error { }
export class SaveNewUnitTemplateDescriptionTooLong extends Error { }
export class SaveNewUnitTemplateMarkingCriteriaTooLong extends Error { }
export class SaveNewUnitTemplateOrderLessThanZero extends Error { }
export class SaveNewUnitTemplateOrderTooLarge extends Error { }
export class SaveNewUnitTemplateUnitLetterAlreadyInUse extends Error { }

export class SaveNewUnitTemplateInteractor implements IInteractor<SaveNewUnitTemplateRequestDTO, SaveNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewUnitTemplateRequestDTO): Promise<ResultType<SaveNewUnitTemplateResponseDTO>> {
    try {
      const { unitLetter, title, description, markingCriteria, order, optional } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin },
        include: {
          course: true,
        },
      });
      if (!unitTemplate) {
        return Result.fail(new SaveNewUnitTemplateNotFound());
      }

      if (unitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewUnitTemplateUnitsEnabled());
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

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return Result.fail(new SaveNewUnitTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new SaveNewUnitTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new SaveNewUnitTemplateMarkingCriteriaTooLong());
        }
      }

      if (order < 0) {
        return Result.fail(new SaveNewUnitTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewUnitTemplateOrderTooLarge());
      }

      // update the unit template
      let updatedUnitTemplate: NewUnitTemplate;
      try {
        updatedUnitTemplate = await this.prisma.newUnitTemplate.update({
          data: {
            unitLetter,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            order,
            optional,
          },
          where: { unitTemplateId: unitIdBin },
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
        unitTemplateId: this.uuidService.binToUUID(updatedUnitTemplate.unitTemplateId),
        courseId: updatedUnitTemplate.courseId,
        unitLetter: updatedUnitTemplate.unitLetter,
        title: updatedUnitTemplate.title,
        description: updatedUnitTemplate.description,
        markingCriteria: updatedUnitTemplate.markingCriteria,
        optional: updatedUnitTemplate.optional,
        order: updatedUnitTemplate.order,
        created: updatedUnitTemplate.created,
        modified: updatedUnitTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error saving unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
