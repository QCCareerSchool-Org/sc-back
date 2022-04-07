import type { NewPartTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import { isNewDescriptionType } from '../../domain/newDescriptionType';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  data: {
    partNumber: number;
    title: string;
    description: string | null;
    descriptionType: string;
    markingCriteria: string | null;
  };
};

export type SaveNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class SaveNewPartTemplateNotFound extends Error { }
export class SaveNewPartTemplateUnitsEnabled extends Error { }
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
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, partId, data }: SaveNewPartTemplateRequestDTO): Promise<ResultType<SaveNewPartTemplateResponseDTO>> {
    try {
      const { partNumber, title, description, descriptionType, markingCriteria } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
        include: {
          newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return Result.fail(new SaveNewPartTemplateNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewPartTemplateUnitsEnabled());
      }

      // validate the data
      if (title.length === 0) {
        return Result.fail(new SaveNewPartTemplatePartTitleEmpty());
      }
      if ([ ...title ].length > 191) {
        return Result.fail(new SaveNewPartTemplatePartTitleTooLong());
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new SaveNewPartTemplateDescriptionTooLong());
        }
      }
      if (descriptionType.length === 0) {
        return Result.fail(new SaveNewPartTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return Result.fail(new SaveNewPartTemplateInvalidDescriptionType());
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new SaveNewPartTemplateMarkingCriteriaTooLong());
        }
      }

      if (partNumber < 1) {
        return Result.fail(new SaveNewPartTemplatePartNumberLessThanOne());
      }
      if (partNumber > 127) {
        return Result.fail(new SaveNewPartTemplatePartNumberTooLarge());
      }

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
          },
          where: { partTemplateId: partIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'assignment_template_id_part_number') {
            return Result.fail(new SaveNewPartTemplatePartNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        partTemplateId: this.uuidService.binToUUID(updatedPartTemplate.partTemplateId),
        assignmentTemplateId: this.uuidService.binToUUID(updatedPartTemplate.assignmentTemplateId),
        partNumber: updatedPartTemplate.partNumber,
        title: updatedPartTemplate.title,
        description: updatedPartTemplate.description,
        descriptionType: updatedPartTemplate.descriptionType,
        markingCriteria: updatedPartTemplate.markingCriteria,
        created: updatedPartTemplate.created,
        modified: updatedPartTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error saving part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
