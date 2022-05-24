import type { NewAssignmentTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewAssignmentTemplateRequestDTO = {
  assignmentId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  markingCriteria: string | null;
  optional: boolean;
};

export type SaveNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class SaveNewAssignmentTemplateNotFound extends Error { }
export class SaveNewAssignmentTemplateUnitsEnabled extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }
export class SaveNewAssignmentTemplateTitleTooLong extends Error { }
export class SaveNewAssignmentTemplateDescriptionTooLong extends Error { }
export class SaveNewAssignmentTemplateMarkingCriteriaTooLong extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse extends Error { }

export class SaveNewAssignmentTemplateInteractor implements IInteractor<SaveNewAssignmentTemplateRequestDTO, SaveNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewAssignmentTemplateRequestDTO): Promise<ResultType<SaveNewAssignmentTemplateResponseDTO>> {
    try {
      const { assignmentNumber, title, description, markingCriteria, optional } = request;
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: {
          newUnitTemplate: { include: { course: true } },
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new SaveNewAssignmentTemplateNotFound());
      }

      if (assignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewAssignmentTemplateUnitsEnabled());
      }

      // validate the data
      if (assignmentNumber < 1) {
        return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberLessThanOne());
      }
      if (assignmentNumber > 127) {
        return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberTooLarge());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return Result.fail(new SaveNewAssignmentTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new SaveNewAssignmentTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new SaveNewAssignmentTemplateMarkingCriteriaTooLong());
        }
      }

      // update the assignment template
      let updatedAssignmentTemplate: NewAssignmentTemplate;
      try {
        updatedAssignmentTemplate = await this.prisma.newAssignmentTemplate.update({
          data: {
            assignmentNumber,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            optional,
          },
          where: { assignmentTemplateId: assignmentIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'unit_template_id_assignment_number') {
            return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        assignmentTemplateId: this.uuidService.binToUUID(updatedAssignmentTemplate.assignmentTemplateId),
        unitTemplateId: this.uuidService.binToUUID(updatedAssignmentTemplate.unitTemplateId),
        assignmentNumber: updatedAssignmentTemplate.assignmentNumber,
        title: updatedAssignmentTemplate.title,
        description: updatedAssignmentTemplate.description,
        markingCriteria: updatedAssignmentTemplate.markingCriteria,
        optional: updatedAssignmentTemplate.optional,
        created: updatedAssignmentTemplate.created,
        modified: updatedAssignmentTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error saving assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
