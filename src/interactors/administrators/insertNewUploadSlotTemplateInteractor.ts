import type { PrismaClient } from '@prisma/client';

import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewUploadSlotTemplateRequestDTO = {
  partId: string;
  label: string;
  allowedTypes: string[];
  points: number;
  optional: boolean;
  order: number;
};

export type InsertNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

export class InsertNewUploadSlotTemplatePartNotFound extends Error { }
export class InsertNewUploadSlotTemplateSubmissionsEnabled extends Error { }
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
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: InsertNewUploadSlotTemplateRequestDTO): Promise<ResultType<InsertNewUploadSlotTemplateResponseDTO>> {
    try {
      const { label, allowedTypes, points, optional, order } = request;
      const partIdBin = this.uuidService.uuidToBin(request.partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return Result.fail(new InsertNewUploadSlotTemplatePartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new InsertNewUploadSlotTemplateSubmissionsEnabled());
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

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

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
          created: prismaNow,
          modified: prismaNow,
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
        created: this.dateService.fixPrismaReadDate(insertedTextBoxTemplate.created),
        modified: this.dateService.fixPrismaReadDate(insertedTextBoxTemplate.modified),
      });

    } catch (err) {
      this.logger.error('error inserting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
