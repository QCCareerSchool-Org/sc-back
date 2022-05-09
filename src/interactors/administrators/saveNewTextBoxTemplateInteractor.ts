import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewTextBoxTemplateRequestDTO = {
  textBoxId: string;
  description: string | null;
  lines: number | null;
  points: number;
  optional: boolean;
  order: number;
};

export type SaveNewTextBoxTemplateResponseDTO = NewTextBoxTemplateDTO;

export class SaveNewTextBoxTemplateNotFound extends Error { }
export class SaveNewTextBoxTemplateUnitsEnabled extends Error { }
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
      const { description, lines, points, optional, order } = request;
      const textBoxIdBin = this.uuidService.uuidToBin(request.textBoxId);

      // find the text box template
      const textBoxTemplate = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxTemplateId: textBoxIdBin },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!textBoxTemplate) {
        return Result.fail(new SaveNewTextBoxTemplateNotFound());
      }

      if (textBoxTemplate.newPartTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewTextBoxTemplateUnitsEnabled());
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

      // update the text box template
      const updatedTextBoxTemplate = await this.prisma.newTextBoxTemplate.update({
        data: {
          description: description?.length ? description : null,
          lines,
          points,
          optional,
          order,
        },
        where: { textBoxTemplateId: textBoxIdBin },
      });

      return Result.success({
        textBoxTemplateId: this.uuidService.binToUUID(updatedTextBoxTemplate.textBoxTemplateId),
        partTemplateId: this.uuidService.binToUUID(updatedTextBoxTemplate.partTemplateId),
        description: updatedTextBoxTemplate.description,
        lines: updatedTextBoxTemplate.lines,
        points: updatedTextBoxTemplate.points,
        optional: updatedTextBoxTemplate.optional,
        order: updatedTextBoxTemplate.order,
        created: updatedTextBoxTemplate.created,
        modified: updatedTextBoxTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error saving text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
