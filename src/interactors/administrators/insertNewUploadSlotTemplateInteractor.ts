import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type InsertNewUploadSlotTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  data: {
    label: string;
    allowedTypes: string[];
    points: number;
    optional: boolean;
    order: number;
  };
};

export type InsertNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

export class InsertNewUploadSlotTemplatePartNotFound extends Error { }
export class InsertNewUploadSlotTemplateUnitsEnabled extends Error { }
export class InsertNewUploadSlotTemplateLabelEmpty extends Error { }
export class InsertNewUploadSlotTemplateAllowedTypesEmpty extends Error { }
export class InsertNewUploadSlotTemplateInvalidAllowedType extends Error { }
export class InsertNewUploadSlotTemplatePointsLessThanZero extends Error { }
export class InsertNewUploadSlotTemplatePointsTooLarge extends Error { }
export class InsertNewUploadSlotTemplateOrderLessThanZero extends Error { }
export class InsertNewUploadSlotTemplateOrderTooLarge extends Error { }

export class InsertNewUploadSlotTemplateInteractor implements IInteractor<InsertNewUploadSlotTemplateRequestDTO, InsertNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewUploadSlotTemplateRequestDTO): Promise<ResultType<InsertNewUploadSlotTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { label, allowedTypes, points, optional, order } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
        include: {
          newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return Result.fail(new InsertNewUploadSlotTemplatePartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new InsertNewUploadSlotTemplateUnitsEnabled());
      }

      // validate the data
      if (label.length === 0) {
        return Result.fail(new InsertNewUploadSlotTemplateLabelEmpty());
      }

      if (allowedTypes.length === 0) {
        return Result.fail(new InsertNewUploadSlotTemplateAllowedTypesEmpty());
      }
      for (const allowedType of allowedTypes) {
        if (![ 'image', 'pdf', 'word', 'excel' ].includes(allowedType)) {
          return Result.fail(new InsertNewUploadSlotTemplateInvalidAllowedType());
        }
      }

      if (points < 0) {
        return Result.fail(new InsertNewUploadSlotTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return Result.fail(new InsertNewUploadSlotTemplatePointsTooLarge());
      }

      if (order < 0) {
        return Result.fail(new InsertNewUploadSlotTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new InsertNewUploadSlotTemplateOrderTooLarge());
      }

      // insert the text box template
      const insertedTextBoxTemplate = await this.prisma.newUploadSlotTemplate.create({
        data: {
          uploadSlotTemplateId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          partTemplateId: partIdBin,
          label,
          allowedTypes: allowedTypes.join(','),
          points,
          optional,
          order,
        },
      });

      return Result.success({
        uploadSlotTemplateId: this.uuidService.binToUUID(insertedTextBoxTemplate.uploadSlotTemplateId),
        partTemplateId: this.uuidService.binToUUID(insertedTextBoxTemplate.partTemplateId),
        label: insertedTextBoxTemplate.label,
        allowedTypes: insertedTextBoxTemplate.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: insertedTextBoxTemplate.points,
        optional: insertedTextBoxTemplate.optional,
        order: insertedTextBoxTemplate.order,
        created: insertedTextBoxTemplate.created,
        modified: insertedTextBoxTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error inserting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
