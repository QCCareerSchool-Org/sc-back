import type { NewAssignmentTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/index.js';

import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewAssignmentTemplateRequestDTO = {
  unitId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  markingCriteria: string | null;
  optional: boolean;
};

export type InsertNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class InsertNewAssignmentTemplateUnitNotFound extends Error { }
export class InsertNewAssignmentTemplateUnitsEnabled extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }
export class InsertNewAssignmentTemplateTitleTooLong extends Error { }
export class InsertNewAssignmentTemplateDescriptionTooLong extends Error { }
export class InsertNewAssignmentTemplateMarkingCriteriaTooLong extends Error { }
export class InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse extends Error { }

export class InsertNewAssignmentTemplateInteractor implements IInteractor<InsertNewAssignmentTemplateRequestDTO, InsertNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewAssignmentTemplateRequestDTO): Promise<ResultType<InsertNewAssignmentTemplateResponseDTO>> {
    try {
      const { assignmentNumber, title, description, markingCriteria, optional } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin },
        include: { course: true },
      });
      if (!unitTemplate) {
        return Result.fail(new InsertNewAssignmentTemplateUnitNotFound());
      }

      if (unitTemplate.course.newUnitsEnabled) {
        return Result.fail(new InsertNewAssignmentTemplateUnitsEnabled());
      }

      // validate the data
      if (assignmentNumber < 1) {
        return Result.fail(new InsertNewAssignmentTemplateAssignmentNumberLessThanOne());
      }
      if (assignmentNumber > 127) {
        return Result.fail(new InsertNewAssignmentTemplateAssignmentNumberTooLarge());
      }

      if (title !== null) {
        if ([ ...title ].length > 191) {
          return Result.fail(new InsertNewAssignmentTemplateTitleTooLong());
        }
      }

      if (description !== null) {
        if ([ ...description ].length > 65_535) {
          return Result.fail(new InsertNewAssignmentTemplateDescriptionTooLong());
        }
      }

      if (markingCriteria !== null) {
        if ([ ...markingCriteria ].length > 65_535) {
          return Result.fail(new InsertNewAssignmentTemplateMarkingCriteriaTooLong());
        }
      }

      // insert the assignment template
      let insertedAssignmentTemplate: NewAssignmentTemplate;
      try {
        insertedAssignmentTemplate = await this.prisma.newAssignmentTemplate.create({
          data: {
            assignmentTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            unitTemplateId: unitIdBin,
            assignmentNumber,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            markingCriteria: markingCriteria?.length ? markingCriteria : null,
            optional,
          },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'unit_template_id_assignment_number') {
            return Result.fail(new InsertNewAssignmentTemplateAssignmentNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        assignmentTemplateId: this.uuidService.binToUUID(insertedAssignmentTemplate.assignmentTemplateId),
        unitTemplateId: this.uuidService.binToUUID(insertedAssignmentTemplate.unitTemplateId),
        assignmentNumber: insertedAssignmentTemplate.assignmentNumber,
        title: insertedAssignmentTemplate.title,
        description: insertedAssignmentTemplate.description,
        markingCriteria: insertedAssignmentTemplate.markingCriteria,
        optional: insertedAssignmentTemplate.optional,
        created: insertedAssignmentTemplate.created,
        modified: insertedAssignmentTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error inserting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
