import type { NewSubmissionTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';

import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewSubmissionTemplateRequestDTO = {
  courseId: number;
  unitLetter: string;
  title: string | null;
  description: string | null;
  markingCriteria: string | null;
  optional: boolean;
  order: number;
};

export type InsertNewSubmissionTemplateResponseDTO = NewSubmissionTemplateDTO;

export class InsertNewSubmissionTemplateCourseNotFound extends Error { }
export class InsertNewSubmissionTemplateSubmissionsEnabled extends Error { }
export class InsertNewSubmissionTemplateSubmissionLetterEmpty extends Error { }
export class InsertNewSubmissionTemplateSubmissionLetterTooLong extends Error { }
export class InsertNewSubmissionTemplateInvalidSubmissionLetter extends Error { }
export class InsertNewSubmissionTemplateTitleTooLong extends Error { }
export class InsertNewSubmissionTemplateDescriptionTooLong extends Error { }
export class InsertNewSubmissionTemplateMarkingCriteriaTooLong extends Error { }
export class InsertNewSubmissionTemplateOrderLessThanZero extends Error { }
export class InsertNewSubmissionTemplateOrderTooLarge extends Error { }
export class InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse extends Error { }

export class InsertNewSubmissionTemplateInteractor implements IInteractor<InsertNewSubmissionTemplateRequestDTO, InsertNewSubmissionTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewSubmissionTemplateRequestDTO): Promise<ResultType<InsertNewSubmissionTemplateResponseDTO>> {
    try {
      const { courseId, unitLetter, title, description, markingCriteria, optional, order } = request;

      // find the course
      const course = await this.prisma.course.findFirst({
        where: { courseId },
      });
      if (!course) {
        return Result.fail(new InsertNewSubmissionTemplateCourseNotFound());
      }

      if (course.submissionsEnabled) {
        return Result.fail(new InsertNewSubmissionTemplateSubmissionsEnabled());
      }

      // validate the data
      if (unitLetter.length === 0) {
        return Result.fail(new InsertNewSubmissionTemplateSubmissionLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return Result.fail(new InsertNewSubmissionTemplateSubmissionLetterTooLong());
      }
      if (!/^[a-z0-9]$/iu.test(unitLetter)) {
        return Result.fail(new InsertNewSubmissionTemplateInvalidSubmissionLetter());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return Result.fail(new InsertNewSubmissionTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new InsertNewSubmissionTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new InsertNewSubmissionTemplateMarkingCriteriaTooLong());
        }
      }

      if (order < 0) {
        return Result.fail(new InsertNewSubmissionTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewSubmissionTemplateOrderTooLarge());
      }

      const localDate = this.dateService.getLocalDate() + 'Z'; // TODO: Update if Prisma ever gets timezones working properly

      // insert the submission template
      let insertedSubmissionTemplate: NewSubmissionTemplate;
      try {
        insertedSubmissionTemplate = await this.prisma.newSubmissionTemplate.create({
          data: {
            submissionTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            courseId,
            unitLetter,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            order,
            optional,
            created: localDate,
            modified: localDate,
          },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_submission_letter') {
            return Result.fail(new InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        submissionTemplateId: this.uuidService.binToUUID(insertedSubmissionTemplate.submissionTemplateId),
        courseId: insertedSubmissionTemplate.courseId,
        unitLetter: insertedSubmissionTemplate.unitLetter,
        title: insertedSubmissionTemplate.title,
        description: insertedSubmissionTemplate.description,
        markingCriteria: insertedSubmissionTemplate.markingCriteria,
        optional: insertedSubmissionTemplate.optional,
        order: insertedSubmissionTemplate.order,
        created: insertedSubmissionTemplate.created,
        modified: insertedSubmissionTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error inserting submission template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
