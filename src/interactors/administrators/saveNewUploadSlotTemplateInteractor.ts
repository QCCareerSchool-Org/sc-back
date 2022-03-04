import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewUploadSlotTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  uploadSlotId: string;
  data: {
    label: string;
    allowedTypes: string[];
    points: number;
    optional: boolean;
    order: number;
  };
};

export type SaveNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

export class SaveNewUploadSlotTemplateNotFound extends Error { }
export class SaveNewUploadSlotTemplateLabelEmpty extends Error { }
export class SaveNewUploadSlotTemplateAllowedTypesEmpty extends Error { }
export class SaveNewUploadSlotTemplateInvalidAllowedType extends Error { }
export class SaveNewUploadSlotTemplatePointsLessThanZero extends Error { }
export class SaveNewUploadSlotTemplatePointsTooLarge extends Error { }
export class SaveNewUploadSlotTemplateOrderLessThanZero extends Error { }
export class SaveNewUploadSlotTemplateOrderTooLarge extends Error { }

export class SaveNewUploadSlotTemplateInteractor implements IInteractor<SaveNewUploadSlotTemplateRequestDTO, SaveNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewUploadSlotTemplateRequestDTO): Promise<ResultType<SaveNewUploadSlotTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const { label, allowedTypes, points, optional, order } = request.data;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      // find the upload slot
      const uploadSlot = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, part: { partId: partIdBin, assignment: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } } } },
      });
      if (!uploadSlot) {
        return Result.fail(new SaveNewUploadSlotTemplateNotFound());
      }

      // validate the data
      if (label.length === 0) {
        return Result.fail(new SaveNewUploadSlotTemplateLabelEmpty());
      }

      if (allowedTypes.length === 0) {
        return Result.fail(new SaveNewUploadSlotTemplateAllowedTypesEmpty());
      }
      for (const allowedType of allowedTypes) {
        if (![ 'image', 'pdf', 'word', 'excel' ].includes(allowedType)) {
          return Result.fail(new SaveNewUploadSlotTemplateInvalidAllowedType());
        }
      }

      if (points < 0) {
        return Result.fail(new SaveNewUploadSlotTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return Result.fail(new SaveNewUploadSlotTemplatePointsTooLarge());
      }

      if (order < 0) {
        return Result.fail(new SaveNewUploadSlotTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewUploadSlotTemplateOrderTooLarge());
      }

      // update the upload slot
      const updatedUploadSlot = await this.prisma.newUploadSlotTemplate.update({
        data: {
          label,
          allowedTypes: allowedTypes.join(','),
          points,
          optional,
          order,
        },
        where: { uploadSlotId: uploadSlotIdBin },
      });

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(updatedUploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(updatedUploadSlot.partId),
        label: updatedUploadSlot.label,
        allowedTypes: updatedUploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlot.points,
        optional: updatedUploadSlot.optional,
        order: updatedUploadSlot.order,
        created: updatedUploadSlot.created,
        modified: updatedUploadSlot.modified,
      });

    } catch (err) {
      this.logger.error('error saving upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
