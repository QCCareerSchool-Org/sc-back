import type { NewSubmissionTemplate, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

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

abstract class InsertNewSubmissionTemplateError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class InsertNewSubmissionTemplateCourseNotFound extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateSubmissionsEnabled extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateSubmissionLetterEmpty extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateSubmissionLetterTooLong extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateInvalidSubmissionLetter extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateTitleTooLong extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateDescriptionTooLong extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateMarkingCriteriaTooLong extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateOrderLessThanZero extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateOrderTooLarge extends InsertNewSubmissionTemplateError { }
export class InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse extends InsertNewSubmissionTemplateError { }

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
        return failure(new InsertNewSubmissionTemplateCourseNotFound());
      }

      if (course.submissionsEnabled) {
        return failure(new InsertNewSubmissionTemplateSubmissionsEnabled());
      }

      // validate the data
      if (unitLetter.length === 0) {
        return failure(new InsertNewSubmissionTemplateSubmissionLetterEmpty());
      }
      if (unitLetter.length > 1) {
        return failure(new InsertNewSubmissionTemplateSubmissionLetterTooLong());
      }
      if (!/^[a-z0-9]$/iu.test(unitLetter)) {
        return failure(new InsertNewSubmissionTemplateInvalidSubmissionLetter());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return failure(new InsertNewSubmissionTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return failure(new InsertNewSubmissionTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return failure(new InsertNewSubmissionTemplateMarkingCriteriaTooLong());
        }
      }

      if (order < 0) {
        return failure(new InsertNewSubmissionTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new InsertNewSubmissionTemplateOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

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
            created: prismaNow,
            modified: prismaNow,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'course_id_submission_letter') {
            return failure(new InsertNewSubmissionTemplateSubmissionLetterAlreadyInUse());
          }
        }
        throw err;
      }

      return success({
        submissionTemplateId: this.uuidService.binToUUID(insertedSubmissionTemplate.submissionTemplateId),
        courseId: insertedSubmissionTemplate.courseId,
        unitLetter: insertedSubmissionTemplate.unitLetter,
        title: insertedSubmissionTemplate.title,
        description: insertedSubmissionTemplate.description,
        markingCriteria: insertedSubmissionTemplate.markingCriteria,
        optional: insertedSubmissionTemplate.optional,
        order: insertedSubmissionTemplate.order,
        created: this.dateService.fixPrismaReadDate(insertedSubmissionTemplate.created),
        modified: this.dateService.fixPrismaReadDate(insertedSubmissionTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error inserting submission template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
