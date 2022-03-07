import type { PrismaClient } from '@prisma/client';
import { v1 } from 'uuid';

import type { IInteractor } from '..';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InsertNewTextBoxTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  data: {
    description: string | null;
    lines: number | null;
    points: number;
    optional: boolean;
    order: number;
  };
};

export type InsertNewTextBoxTemplateResponseDTO = NewTextBoxTemplateDTO;

export class InsertNewTextBoxTemplatePartNotFound extends Error { }
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
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewTextBoxTemplateRequestDTO): Promise<ResultType<InsertNewTextBoxTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { description, lines, points, optional, order } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const part = await this.prisma.newPartTemplate.findFirst({
        where: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, course: { courseId, schoolId } } } },
      });
      if (!part) {
        return Result.fail(new InsertNewTextBoxTemplatePartNotFound());
      }

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

      // insert the text box
      const insertedTextBox = await this.prisma.newTextBoxTemplate.create({
        data: {
          textBoxId: this.uuidService.uuidToBin(v1()),
          partId: partIdBin,
          description,
          lines,
          points,
          optional,
          order,
        },
      });

      return Result.success({
        textBoxId: this.uuidService.binToUUID(insertedTextBox.textBoxId),
        partId: this.uuidService.binToUUID(insertedTextBox.partId),
        description: insertedTextBox.description,
        lines: insertedTextBox.lines,
        points: insertedTextBox.points,
        optional: insertedTextBox.optional,
        order: insertedTextBox.order,
        created: insertedTextBox.created,
        modified: insertedTextBox.modified,
      });

    } catch (err) {
      this.logger.error('error inserting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
