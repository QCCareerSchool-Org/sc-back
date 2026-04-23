import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewUploadSlotTemplateRequestDTO = {
  uploadSlotId: string;
  label: string;
  allowedTypes: string[];
  points: number;
  optional: boolean;
  order: number;
};

export type SaveNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

abstract class SaveNewUploadSlotTemplateError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveNewUploadSlotTemplateNotFound extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateSubmissionsEnabled extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateLabelEmpty extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateAllowedTypesEmpty extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateInvalidAllowedType extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplatePointsLessThanZero extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplatePointsTooLarge extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateOrderLessThanZero extends SaveNewUploadSlotTemplateError { }
export class SaveNewUploadSlotTemplateOrderTooLarge extends SaveNewUploadSlotTemplateError { }

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
        return failure(new SaveNewUploadSlotTemplateNotFound());
      }

      if (uploadSlotTemplate.newPartTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewUploadSlotTemplateSubmissionsEnabled());
      }

      // validate the data
      if (label.length === 0) {
        return failure(new SaveNewUploadSlotTemplateLabelEmpty());
      }

      if (allowedTypes.length === 0) {
        return failure(new SaveNewUploadSlotTemplateAllowedTypesEmpty());
      }
      for (const allowedType of allowedTypes) {
        if (![ 'image', 'pdf', 'word', 'excel' ].includes(allowedType)) {
          return failure(new SaveNewUploadSlotTemplateInvalidAllowedType());
        }
      }

      if (points < 0) {
        return failure(new SaveNewUploadSlotTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return failure(new SaveNewUploadSlotTemplatePointsTooLarge());
      }

      if (order < 0) {
        return failure(new SaveNewUploadSlotTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new SaveNewUploadSlotTemplateOrderTooLarge());
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

      return success({
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
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
