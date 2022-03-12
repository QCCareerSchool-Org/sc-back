import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type DeleteNewTextBoxTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  textBoxId: string;
};

export type DeleteNewTextBoxTemplateResponseDTO = void;

export class DeleteNewTextBoxTemplateNotFound extends Error { }
export class DeleteNewTextBoxTemplateUnitsEnabled extends Error { }

export class DeleteNewTextBoxTemplateInteractor implements IInteractor<DeleteNewTextBoxTemplateRequestDTO, DeleteNewTextBoxTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewTextBoxTemplateRequestDTO): Promise<ResultType<DeleteNewTextBoxTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      // find the text box template
      const textBoxTemplate = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxTemplateId: textBoxIdBin, newPartTemplate: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } } },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!textBoxTemplate) {
        return Result.fail(new DeleteNewTextBoxTemplateNotFound());
      }

      if (textBoxTemplate.newPartTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewTextBoxTemplateUnitsEnabled());
      }

      // delete the text box template
      await this.prisma.newTextBoxTemplate.delete({ where: { textBoxTemplateId: textBoxIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
