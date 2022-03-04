import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewTextBoxTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  textBoxId: string;
  data: {
    description: string | null;
    lines: number | null;
    points: number;
    optional: boolean;
    order: number;
  };
};

export type SaveNewTextBoxTemplateResponseDTO = NewTextBoxTemplateDTO;

export class SaveNewTextBoxTemplateNotFound extends Error { }
export class SaveNewTextBoxTemplateLinesLessThanOne extends Error { }
export class SaveNewTextBoxTemplateLinesTooLarge extends Error { }
export class SaveNewTextBoxTemplatePointsLessThanZero extends Error { }
export class SaveNewTextBoxTemplatePointsTooLarge extends Error { }
export class SaveNewTextBoxTemplateOrderLessThanZero extends Error { }
export class SaveNewTextBoxTemplateOrderTooLarge extends Error { }

export class SaveNewTextBoxTemplateInteractor implements IInteractor<SaveNewTextBoxTemplateRequestDTO, SaveNewTextBoxTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewTextBoxTemplateRequestDTO): Promise<ResultType<SaveNewTextBoxTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { description, lines, points, optional, order } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      // find the text box
      const textBox = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxId: textBoxIdBin, part: { partId: partIdBin, assignment: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } } } },
      });
      if (!textBox) {
        return Result.fail(new SaveNewTextBoxTemplateNotFound());
      }

      // validate the data
      if (lines !== null) {
        if (lines < 1) {
          return Result.fail(new SaveNewTextBoxTemplateLinesLessThanOne());
        }
        if (lines > 127) {
          return Result.fail(new SaveNewTextBoxTemplateLinesTooLarge());
        }
      }

      if (points < 0) {
        return Result.fail(new SaveNewTextBoxTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return Result.fail(new SaveNewTextBoxTemplatePointsTooLarge());
      }

      if (order < 0) {
        return Result.fail(new SaveNewTextBoxTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewTextBoxTemplateOrderTooLarge());
      }

      // update the text box
      const updatedTextBox = await this.prisma.newTextBoxTemplate.update({
        data: { description, lines, points, optional, order },
        where: { textBoxId: textBoxIdBin },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(updatedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(updatedTextBox.partId),
        description: updatedTextBox.description,
        lines: updatedTextBox.lines,
        points: updatedTextBox.points,
        optional: updatedTextBox.optional,
        order: updatedTextBox.order,
        created: updatedTextBox.created,
        modified: updatedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
