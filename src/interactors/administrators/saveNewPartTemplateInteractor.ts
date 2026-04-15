import type { NewPartTemplate, PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import { isNewDescriptionType } from '../../domain/newDescriptionType.js';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewPartTemplateRequestDTO = {
  partId: string;
  partNumber: number;
  title: string;
  description: string | null;
  descriptionType: string;
  markingCriteria: string | null;
};

export type SaveNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class SaveNewPartTemplateNotFound extends Error { }
export class SaveNewPartTemplateSubmissionsEnabled extends Error { }
export class SaveNewPartTemplatePartTitleEmpty extends Error { }
export class SaveNewPartTemplatePartTitleTooLong extends Error { }
export class SaveNewPartTemplateDescriptionTooLong extends Error { }
export class SaveNewPartTemplateDescriptionTypeEmpty extends Error { }
export class SaveNewPartTemplateInvalidDescriptionType extends Error { }
export class SaveNewPartTemplateMarkingCriteriaTooLong extends Error { }
export class SaveNewPartTemplatePartNumberLessThanOne extends Error { }
export class SaveNewPartTemplatePartNumberTooLarge extends Error { }
export class SaveNewPartTemplatePartNumberAlreadyInUse extends Error { }

export class SaveNewPartTemplateInteractor implements IInteractor<SaveNewPartTemplateRequestDTO, SaveNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewPartTemplateRequestDTO): Promise<ResultType<SaveNewPartTemplateResponseDTO>> {
    try {
      const { partNumber, title, description, descriptionType, markingCriteria } = request;
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return failure(new SaveNewPartTemplateNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewPartTemplateSubmissionsEnabled());
      }

      // validate the data
      if (title.length === 0) {
        return failure(new SaveNewPartTemplatePartTitleEmpty());
      }
      if ([ ...title ].length > 191) {
        return failure(new SaveNewPartTemplatePartTitleTooLong());
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return failure(new SaveNewPartTemplateDescriptionTooLong());
        }
      }

      if (descriptionType.length === 0) {
        return failure(new SaveNewPartTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return failure(new SaveNewPartTemplateInvalidDescriptionType());
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return failure(new SaveNewPartTemplateMarkingCriteriaTooLong());
        }
      }

      if (partNumber < 1) {
        return failure(new SaveNewPartTemplatePartNumberLessThanOne());
      }
      if (partNumber > 127) {
        return failure(new SaveNewPartTemplatePartNumberTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the part template
      let updatedPartTemplate: NewPartTemplate;
      try {
        updatedPartTemplate = await this.prisma.newPartTemplate.update({
          data: {
            partNumber,
            title: title,
            description: description?.length ? description : null,
            descriptionType,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            modified: prismaNow,
          },
          where: { partTemplateId: partIdBin },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'assignment_template_id_part_number') {
            return failure(new SaveNewPartTemplatePartNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return success({
        partTemplateId: this.uuidService.binToUUID(updatedPartTemplate.partTemplateId),
        assignmentTemplateId: this.uuidService.binToUUID(updatedPartTemplate.assignmentTemplateId),
        partNumber: updatedPartTemplate.partNumber,
        title: updatedPartTemplate.title,
        description: updatedPartTemplate.description,
        descriptionType: updatedPartTemplate.descriptionType,
        markingCriteria: updatedPartTemplate.markingCriteria,
        created: this.dateService.fixPrismaReadDate(updatedPartTemplate.created),
        modified: this.dateService.fixPrismaReadDate(updatedPartTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error saving part template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
