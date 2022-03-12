import type { NewPartTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import { isNewDescriptionType } from '../../domain/newDescriptionType';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type InsertNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  data: {
    partNumber: number;
    title: string;
    description: string | null;
    descriptionType: string;
  };
};

export type InsertNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class InsertNewPartTemplateAssignmentNotFound extends Error { }
export class InsertNewPartTemplateUnitsEnabled extends Error { }
export class InsertNewPartTemplatePartTitleEmpty extends Error { }
export class InsertNewPartTemplatePartTitleTooLong extends Error { }
export class InsertNewPartTemplateDescriptionTooLong extends Error { }
export class InsertNewPartTemplateDescriptionTypeEmpty extends Error { }
export class InsertNewPartTemplateInvalidDescriptionType extends Error { }
export class InsertNewPartTemplatePartNumberLessThanOne extends Error { }
export class InsertNewPartTemplatePartNumberTooLarge extends Error { }
export class InsertNewPartTemplatePartNumberAlreadyInUse extends Error { }

export class InsertNewPartTemplateInteractor implements IInteractor<InsertNewPartTemplateRequestDTO, InsertNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewPartTemplateRequestDTO): Promise<ResultType<InsertNewPartTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { partNumber, title, description, descriptionType } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } },
        include: {
          newUnitTemplate: { include: { course: true } },
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new InsertNewPartTemplateAssignmentNotFound());
      }

      if (assignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new InsertNewPartTemplateUnitsEnabled());
      }

      // validate the data
      if (title.length === 0) {
        return Result.fail(new InsertNewPartTemplatePartTitleEmpty());
      }
      if (new TextEncoder().encode(title).length > 191) {
        return Result.fail(new InsertNewPartTemplatePartTitleTooLong());
      }

      if (description !== null) {
        if (new TextEncoder().encode(description).length > 65_535) {
          return Result.fail(new InsertNewPartTemplateDescriptionTooLong());
        }
      }
      if (descriptionType.length === 0) {
        return Result.fail(new InsertNewPartTemplateDescriptionTypeEmpty());
      }
      if (!isNewDescriptionType(descriptionType)) {
        return Result.fail(new InsertNewPartTemplateInvalidDescriptionType());
      }

      if (partNumber < 1) {
        return Result.fail(new InsertNewPartTemplatePartNumberLessThanOne());
      }
      if (partNumber > 127) {
        return Result.fail(new InsertNewPartTemplatePartNumberTooLarge());
      }

      // insert the part template
      let insertedPartTemplate: NewPartTemplate;
      try {
        insertedPartTemplate = await this.prisma.newPartTemplate.create({
          data: {
            partTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            assignmentTemplateId: assignmentIdBin,
            title: title,
            description: description?.length ? description : null,
            descriptionType,
            partNumber,
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
        created: insertedPartTemplate.created,
        modified: insertedPartTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error inserting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
