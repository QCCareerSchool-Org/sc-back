import type { NewAssignmentTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewAssignmentTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  data: {
    assignmentNumber: number;
    title: string | null;
    description: string | null;
    optional: boolean;
  };
};

export type SaveNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO;

export class SaveNewAssignmentTemplateNotFound extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberLessThanOne extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberTooLarge extends Error { }
export class SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse extends Error { }

export class SaveNewAssignmentTemplateInteractor implements IInteractor<SaveNewAssignmentTemplateRequestDTO, SaveNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, data }: SaveNewAssignmentTemplateRequestDTO): Promise<ResultType<SaveNewAssignmentTemplateResponseDTO>> {
    try {
      const { assignmentNumber, title, description, optional } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);

      // find the assignment template
      const assignment = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, course: { courseId, schoolId } } },
      });
      if (!assignment) {
        return Result.fail(new SaveNewAssignmentTemplateNotFound());
      }

      // validate the data
      if (assignmentNumber < 1) {
        return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberLessThanOne());
      }
      if (assignmentNumber > 127) {
        return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberTooLarge());
      }

      // update the assignment template
      let updatedAssignment: NewAssignmentTemplate;
      try {
        updatedAssignment = await this.prisma.newAssignmentTemplate.update({
          data: {
            assignmentNumber,
            title: title?.length ? title : null,
            description: description?.length ? description : null,
            optional,
          },
          where: { assignmentId: assignmentIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'unit_template_id_assignment_number') {
            return Result.fail(new SaveNewAssignmentTemplateAssignmentNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        assignmentId: this.uuidService.binToUUID(updatedAssignment.assignmentId),
        unitId: this.uuidService.binToUUID(updatedAssignment.unitId),
        assignmentNumber: updatedAssignment.assignmentNumber,
        title: updatedAssignment.title,
        description: updatedAssignment.description,
        optional: updatedAssignment.optional,
        created: updatedAssignment.created,
        modified: updatedAssignment.modified,
      });

    } catch (err) {
      this.logger.error('error saving assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
