import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

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
export class SaveNewTextBoxTemplateSubmissionsEnabled extends Error { }
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
    private readonly dateService: DateService,
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
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!textBoxTemplate) {
        return failure(new SaveNewTextBoxTemplateNotFound());
      }

      if (textBoxTemplate.newPartTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewTextBoxTemplateSubmissionsEnabled());
      }

      // validate the data
      if (lines !== null) {
        if (lines < 1) {
          return failure(new SaveNewTextBoxTemplateLinesLessThanOne());
        }
        if (lines > 127) {
          return failure(new SaveNewTextBoxTemplateLinesTooLarge());
        }
      }

      if (points < 0) {
        return failure(new SaveNewTextBoxTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return failure(new SaveNewTextBoxTemplatePointsTooLarge());
      }

      if (order < 0) {
        return failure(new SaveNewTextBoxTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new SaveNewTextBoxTemplateOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the text box template
      const updatedTextBoxTemplate = await this.prisma.newTextBoxTemplate.update({
        data: {
          description: description?.length ? description : null,
          lines,
          points,
          optional,
          order,
          modified: prismaNow,
        },
        where: { textBoxTemplateId: textBoxIdBin },
      });

      return success({
        textBoxTemplateId: this.uuidService.binToUUID(updatedTextBoxTemplate.textBoxTemplateId),
        partTemplateId: this.uuidService.binToUUID(updatedTextBoxTemplate.partTemplateId),
        description: updatedTextBoxTemplate.description,
        lines: updatedTextBoxTemplate.lines,
        points: updatedTextBoxTemplate.points,
        optional: updatedTextBoxTemplate.optional,
        order: updatedTextBoxTemplate.order,
        created: this.dateService.fixPrismaReadDate(updatedTextBoxTemplate.created),
        modified: this.dateService.fixPrismaReadDate(updatedTextBoxTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error saving text box template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
