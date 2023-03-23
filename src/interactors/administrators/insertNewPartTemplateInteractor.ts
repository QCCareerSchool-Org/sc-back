import type { NewPartTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';

import { isNewDescriptionType } from '../../domain/newDescriptionType.js';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewPartTemplateRequestDTO = {
  assignmentId: string;
  partNumber: number;
  title: string;
  description: string | null;
  descriptionType: string;
  markingCriteria: string | null;
};

export type InsertNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class InsertNewPartTemplateAssignmentNotFound extends Error { }
export class InsertNewPartTemplateSubmissionsEnabled extends Error { }
export class InsertNewPartTemplatePartTitleEmpty extends Error { }
export class InsertNewPartTemplatePartTitleTooLong extends Error { }
export class InsertNewPartTemplateDescriptionTooLong extends Error { }
export class InsertNewPartTemplateDescriptionTypeEmpty extends Error { }
export class InsertNewPartTemplateInvalidDescriptionType extends Error { }
export class InsertNewPartTemplateMarkingCriteriaTooLong extends Error { }
export class InsertNewPartTemplatePartNumberLessThanOne extends Error { }
export class InsertNewPartTemplatePartNumberTooLarge extends Error { }
export class InsertNewPartTemplatePartNumberAlreadyInUse extends Error { }

export class InsertNewPartTemplateInteractor implements IInteractor<InsertNewPartTemplateRequestDTO, InsertNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewPartTemplateRequestDTO): Promise<ResultType<InsertNewPartTemplateResponseDTO>> {
    try {
      const { partNumber, title, description, descriptionType, markingCriteria } = request;
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: {
          newSubmissionTemplate: { include: { course: true } },
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new InsertNewPartTemplateAssignmentNotFound());
      }

      if (assignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new InsertNewPartTemplateSubmissionsEnabled());
      }

      // validate the data
      if (title.length === 0) {
        return Result.fail(new InsertNewPartTemplatePartTitleEmpty());
      }
      if ([ ...title ].length > 191) {
        return Result.fail(new InsertNewPartTemplatePartTitleTooLong());
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new InsertNewPartTemplateDescriptionTooLong());
        }
      }

      if (descriptionType.length === 0) {
        return Result.fail(new InsertNewPartTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return Result.fail(new InsertNewPartTemplateInvalidDescriptionType());
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new InsertNewPartTemplateMarkingCriteriaTooLong());
        }
      }

      if (partNumber < 1) {
        return Result.fail(new InsertNewPartTemplatePartNumberLessThanOne());
      }
      if (partNumber > 127) {
        return Result.fail(new InsertNewPartTemplatePartNumberTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // insert the part template
      let insertedPartTemplate: NewPartTemplate;
      try {
        insertedPartTemplate = await this.prisma.newPartTemplate.create({
          data: {
            partTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            assignmentTemplateId: assignmentIdBin,
            partNumber,
            title: title,
            description: description?.length ? description : null,
            descriptionType,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            created: prismaNow,
            modified: prismaNow,
          },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'assignment_template_id_part_number') {
            return Result.fail(new InsertNewPartTemplatePartNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        partTemplateId: this.uuidService.binToUUID(insertedPartTemplate.partTemplateId),
        assignmentTemplateId: this.uuidService.binToUUID(insertedPartTemplate.assignmentTemplateId),
        partNumber: insertedPartTemplate.partNumber,
        title: insertedPartTemplate.title,
        description: insertedPartTemplate.description,
        descriptionType: insertedPartTemplate.descriptionType,
        markingCriteria: insertedPartTemplate.markingCriteria,
        created: this.dateService.fixPrismaReadDate(insertedPartTemplate.created),
        modified: this.dateService.fixPrismaReadDate(insertedPartTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error inserting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
