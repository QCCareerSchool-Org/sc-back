import type { NewSubmissionTemplate, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewSubmissionTemplateRequestDTO = {
  submissionId: string;
  unitLetter: string;
  title: string | null;
  description: string | null;
  markingCriteria: string | null;
  optional: boolean;
  order: number;
};

export type SaveNewSubmissionTemplateResponseDTO = NewSubmissionTemplateDTO;

abstract class SaveNewSubmissionTemplateError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveNewSubmissionTemplateNotFound extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateSubmissionsEnabled extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateUnitLetterEmpty extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateUnitLetterTooLong extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateInvalidUnitLetter extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateTitleTooLong extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateDescriptionTooLong extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateMarkingCriteriaTooLong extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateOrderLessThanZero extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateOrderTooLarge extends SaveNewSubmissionTemplateError { }
export class SaveNewSubmissionTemplateUnitLetterAlreadyInUse extends SaveNewSubmissionTemplateError { }

export class SaveNewSubmissionTemplateInteractor implements IInteractor<SaveNewSubmissionTemplateRequestDTO, SaveNewSubmissionTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewSubmissionTemplateRequestDTO): Promise<ResultType<SaveNewSubmissionTemplateResponseDTO>> {
    try {
      const { unitLetter, title, description, markingCriteria, order, optional } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);

      // find the submission template
      const submissionTemplate = await this.prisma.newSubmissionTemplate.findFirst({
        where: { submissionTemplateId: submissionIdBin },
        include: {
          course: true,
        },
      });
      if (!submissionTemplate) {
        return failure(new SaveNewSubmissionTemplateNotFound());
      }

      if (submissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewSubmissionTemplateSubmissionsEnabled());
      }

      // validate the data
      if (unitLetter.length === 0) {
        return failure(new SaveNewSubmissionTemplateUnitLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return failure(new SaveNewSubmissionTemplateUnitLetterTooLong());
      }
      if (!/^[a-z0-9]$/iu.test(unitLetter)) {
        return failure(new SaveNewSubmissionTemplateInvalidUnitLetter());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return failure(new SaveNewSubmissionTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return failure(new SaveNewSubmissionTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return failure(new SaveNewSubmissionTemplateMarkingCriteriaTooLong());
        }
      }

      if (order < 0) {
        return failure(new SaveNewSubmissionTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new SaveNewSubmissionTemplateOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the submission template
      let updatedSubmissionTemplate: NewSubmissionTemplate;
      try {
        updatedSubmissionTemplate = await this.prisma.newSubmissionTemplate.update({
          data: {
            unitLetter,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            order,
            optional,
            modified: prismaNow,
          },
          where: { submissionTemplateId: submissionIdBin },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_submission_letter') {
            return failure(new SaveNewSubmissionTemplateUnitLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return success({
        submissionTemplateId: this.uuidService.binToUUID(updatedSubmissionTemplate.submissionTemplateId),
        courseId: updatedSubmissionTemplate.courseId,
        unitLetter: updatedSubmissionTemplate.unitLetter,
        title: updatedSubmissionTemplate.title,
        description: updatedSubmissionTemplate.description,
        markingCriteria: updatedSubmissionTemplate.markingCriteria,
        optional: updatedSubmissionTemplate.optional,
        order: updatedSubmissionTemplate.order,
        created: this.dateService.fixPrismaReadDate(updatedSubmissionTemplate.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmissionTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error saving submission template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
