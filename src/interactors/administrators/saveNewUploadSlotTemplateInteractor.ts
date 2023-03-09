import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

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
export class SaveNewUploadSlotTemplateSubmissionsEnabled extends Error { }
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
    private readonly dateService: DateService,
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
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!uploadSlotTemplate) {
        return Result.fail(new SaveNewUploadSlotTemplateNotFound());
      }

      if (uploadSlotTemplate.newPartTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new SaveNewUploadSlotTemplateSubmissionsEnabled());
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

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the upload slot template
      const updatedUploadSlotTemplate = await this.prisma.newUploadSlotTemplate.update({
        data: {
          label,
          allowedTypes: allowedTypes.join(','),
          points,
          optional,
          order,
          modified: prismaNow,
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
        created: this.dateService.fixPrismaReadDate(updatedUploadSlotTemplate.created),
        modified: this.dateService.fixPrismaReadDate(updatedUploadSlotTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error saving upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
