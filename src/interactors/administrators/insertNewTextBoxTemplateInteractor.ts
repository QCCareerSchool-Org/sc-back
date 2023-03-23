import type { PrismaClient } from '@prisma/client';

import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewTextBoxTemplateRequestDTO = {
  partId: string;
  description: string | null;
  lines: number | null;
  points: number;
  optional: boolean;
  order: number;
};

export type InsertNewTextBoxTemplateResponseDTO = NewTextBoxTemplateDTO;

export class InsertNewTextBoxTemplatePartNotFound extends Error { }
export class InsertNewTextBoxTemplateSubmissionsEnabled extends Error { }
export class InsertNewTextBoxTemplateLinesLessThanOne extends Error { }
export class InsertNewTextBoxTemplateLinesTooLarge extends Error { }
export class InsertNewTextBoxTemplatePointsLessThanZero extends Error { }
export class InsertNewTextBoxTemplatePointsTooLarge extends Error { }
export class InsertNewTextBoxTemplateOrderLessThanZero extends Error { }
export class InsertNewTextBoxTemplateOrderTooLarge extends Error { }

export class InsertNewTextBoxTemplateInteractor implements IInteractor<InsertNewTextBoxTemplateRequestDTO, InsertNewTextBoxTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewTextBoxTemplateRequestDTO): Promise<ResultType<InsertNewTextBoxTemplateResponseDTO>> {
    try {
      const { description, lines, points, optional, order } = request;
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return Result.fail(new InsertNewTextBoxTemplatePartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new InsertNewTextBoxTemplateSubmissionsEnabled());
      }

      // validate the data
      if (lines !== null) {
        if (lines < 1) {
          return Result.fail(new InsertNewTextBoxTemplateLinesLessThanOne());
        }
        if (lines > 127) {
          return Result.fail(new InsertNewTextBoxTemplateLinesTooLarge());
        }
      }

      if (points < 0) {
        return Result.fail(new InsertNewTextBoxTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return Result.fail(new InsertNewTextBoxTemplatePointsTooLarge());
      }

      if (order < 0) {
        return Result.fail(new InsertNewTextBoxTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewTextBoxTemplateOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // insert the text box template
      const insertedTextBoxTemplate = await this.prisma.newTextBoxTemplate.create({
        data: {
          textBoxTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          partTemplateId: partIdBin,
          description: description?.length ? description : null,
          lines,
          points,
          optional,
          order,
          created: prismaNow,
          modified: prismaNow,
        },
      });

      return Result.success({
        textBoxTemplateId: this.uuidService.binToUUID(insertedTextBoxTemplate.textBoxTemplateId),
        partTemplateId: this.uuidService.binToUUID(insertedTextBoxTemplate.partTemplateId),
        description: insertedTextBoxTemplate.description,
        lines: insertedTextBoxTemplate.lines,
        points: insertedTextBoxTemplate.points,
        optional: insertedTextBoxTemplate.optional,
        order: insertedTextBoxTemplate.order,
        created: this.dateService.fixPrismaReadDate(insertedTextBoxTemplate.created),
        modified: this.dateService.fixPrismaReadDate(insertedTextBoxTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error inserting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
