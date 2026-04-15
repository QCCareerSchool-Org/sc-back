import { Prisma } from '@prisma/client';
import type { NewAssignmentTemplate, PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import { isNewDescriptionType } from '../../domain/newDescriptionType.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type InsertNewAssignmentTemplateRequestDTO = {
  submissionId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: string;
  markingCriteria: string | null;
  optional: boolean;
};

export type InsertNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class InsertNewAssignmentTemplateSubmissionNotFound extends Error { }
export class InsertNewAssignmentTemplateSubmissionsEnabled extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }
export class InsertNewAssignmentTemplateTitleTooLong extends Error { }
export class InsertNewAssignmentTemplateDescriptionTooLong extends Error { }
export class InsertNewAssignmentTemplateDescriptionTypeEmpty extends Error { }
export class InsertNewAssignmentTemplateInvalidDescriptionType extends Error { }
export class InsertNewAssignmentTemplateMarkingCriteriaTooLong extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse extends Error { }

export class InsertNewAssignmentTemplateInteractor implements IInteractor<InsertNewAssignmentTemplateRequestDTO, InsertNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewAssignmentTemplateRequestDTO): Promise<ResultType<InsertNewAssignmentTemplateResponseDTO>> {
    try {
      const { assignmentNumber, title, description, descriptionType, markingCriteria, optional } = request;
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);

      // find the submission template
      const submissionTemplate = await this.prisma.newSubmissionTemplate.findFirst({
        where: { submissionTemplateId: submissionIdBin },
        include: { course: true },
      });
      if (!submissionTemplate) {
        return failure(new InsertNewAssignmentTemplateSubmissionNotFound());
      }

      if (submissionTemplate.course.submissionsEnabled) {
        return failure(new InsertNewAssignmentTemplateSubmissionsEnabled());
      }

      // validate the data
      if (assignmentNumber < 1) {
        return failure(new InsertNewAssignmentTemplateAssignmentNumberLessThanOne());
      }
      if (assignmentNumber > 127) {
        return failure(new InsertNewAssignmentTemplateAssignmentNumberTooLarge());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return failure(new InsertNewAssignmentTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return failure(new InsertNewAssignmentTemplateDescriptionTooLong());
        }
      }

      if (descriptionType.length === 0) {
        return failure(new InsertNewAssignmentTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return failure(new InsertNewAssignmentTemplateInvalidDescriptionType());
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return failure(new InsertNewAssignmentTemplateMarkingCriteriaTooLong());
        }
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // insert the assignment template
      let insertedAssignmentTemplate: NewAssignmentTemplate;
      try {
        insertedAssignmentTemplate = await this.prisma.newAssignmentTemplate.create({
          data: {
            assignmentTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            submissionTemplateId: submissionIdBin,
            assignmentNumber,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            descriptionType,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            optional,
            created: prismaNow,
            modified: prismaNow,
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'submission_template_id_assignment_number') {
            return failure(new InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return success({
        assignmentTemplateId: this.uuidService.binToUUID(insertedAssignmentTemplate.assignmentTemplateId),
        submissionTemplateId: this.uuidService.binToUUID(insertedAssignmentTemplate.submissionTemplateId),
        assignmentNumber: insertedAssignmentTemplate.assignmentNumber,
        title: insertedAssignmentTemplate.title,
        description: insertedAssignmentTemplate.description,
        descriptionType: insertedAssignmentTemplate.descriptionType,
        markingCriteria: insertedAssignmentTemplate.markingCriteria,
        optional: insertedAssignmentTemplate.optional,
        created: this.dateService.fixPrismaReadDate(insertedAssignmentTemplate.created),
        modified: this.dateService.fixPrismaReadDate(insertedAssignmentTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error inserting assignment template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
