import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { IDateService } from '../../services/date';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewUploadSlotTemplateRequestDTO = {
  uploadSlotId: string;
  label: string;
  allowedTypes: string[];
  points: number;
  optional: boolean;
  order: number;
};

export type SaveNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

export class SaveNewUploadSlotTemplateNotFound extends Error { }
export class SaveNewUploadSlotTemplateUnitsEnabled extends Error { }
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
      const { label, allowedTypes, points, optional, order } = request;
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      // find the upload slot template
      const uploadSlotTemplate = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotTemplateId: uploadSlotIdBin },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!uploadSlotTemplate) {
        return Result.fail(new SaveNewUploadSlotTemplateNotFound());
      }

      if (uploadSlotTemplate.newPartTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewUploadSlotTemplateUnitsEnabled());
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

      // update the upload slot template
      const updatedUploadSlotTemplate = await this.prisma.newUploadSlotTemplate.update({
        data: {
          label,
          allowedTypes: allowedTypes.join(','),
          points,
          optional,
          order,
        },
        where: { uploadSlotTemplateId: uploadSlotIdBin },
      });

      return Result.success({
        uploadSlotTemplateId: this.uuidService.binToUUID(updatedUploadSlotTemplate.uploadSlotTemplateId),
        partTemplateId: this.uuidService.binToUUID(updatedUploadSlotTemplate.partTemplateId),
        label: updatedUploadSlotTemplate.label,
        allowedTypes: updatedUploadSlotTemplate.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: updatedUploadSlotTemplate.points,
        optional: updatedUploadSlotTemplate.optional,
        order: updatedUploadSlotTemplate.order,
        created: updatedUploadSlotTemplate.created,
        modified: updatedUploadSlotTemplate.modified,
      });

    } catch (err) {
      this.logger.error('error saving upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
