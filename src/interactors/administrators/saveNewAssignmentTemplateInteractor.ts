import type { NewAssignmentTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';

import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import { isNewDescriptionType } from '../../domain/newDescriptionType.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveNewAssignmentTemplateRequestDTO = {
  assignmentId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: string;
  markingCriteria: string | null;
  optional: boolean;
};

export type SaveNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class SaveNewAssignmentTemplateNotFound extends Error { }
export class SaveNewAssignmentTemplateSubmissionsEnabled extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }
export class SaveNewAssignmentTemplateTitleTooLong extends Error { }
export class SaveNewAssignmentTemplateDescriptionTooLong extends Error { }
export class SaveNewAssignmentTemplateDescriptionTypeEmpty extends Error { }
export class SaveNewAssignmentTemplateInvalidDescriptionType extends Error { }
export class SaveNewAssignmentTemplateMarkingCriteriaTooLong extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse extends Error { }

export class SaveNewAssignmentTemplateInteractor implements IInteractor<SaveNewAssignmentTemplateRequestDTO, SaveNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewAssignmentTemplateRequestDTO): Promise<ResultType<SaveNewAssignmentTemplateResponseDTO>> {
    try {
      const { assignmentNumber, title, description, descriptionType, markingCriteria, optional } = request;
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: {
          newSubmissionTemplate: { include: { course: true } },
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new SaveNewAssignmentTemplateNotFound());
      }

      if (assignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new SaveNewAssignmentTemplateSubmissionsEnabled());
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

      if (descriptionType.length === 0) {
        return Result.fail(new SaveNewAssignmentTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return Result.fail(new SaveNewAssignmentTemplateInvalidDescriptionType());
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new SaveNewAssignmentTemplateMarkingCriteriaTooLong());
        }
      }

      const localDate = this.dateService.getLocalDate() + 'Z'; // TODO: Update if Prisma ever gets timezones working properly

      // update the assignment template
      let updatedAssignmentTemplate: NewAssignmentTemplate;
      try {
        updatedAssignmentTemplate = await this.prisma.newAssignmentTemplate.update({
          data: {
            assignmentNumber,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            descriptionType,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            optional,
            modified: localDate,
          },
          where: { assignmentTemplateId: assignmentIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'submission_template_id_assignment_number') {
            return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        assignmentTemplateId: this.uuidService.binToUUID(updatedAssignmentTemplate.assignmentTemplateId),
        submissionTemplateId: this.uuidService.binToUUID(updatedAssignmentTemplate.submissionTemplateId),
        assignmentNumber: updatedAssignmentTemplate.assignmentNumber,
        title: updatedAssignmentTemplate.title,
        description: updatedAssignmentTemplate.description,
        descriptionType: updatedAssignmentTemplate.descriptionType,
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
