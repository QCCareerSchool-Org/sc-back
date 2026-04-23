import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type InsertNewUploadSlotTemplateRequestDTO = {
  partId: string;
  label: string;
  allowedTypes: string[];
  points: number;
  optional: boolean;
  order: number;
};

export type InsertNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO;

abstract class InsertNewUploadSlotTemplateError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class InsertNewUploadSlotTemplatePartNotFound extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateSubmissionsEnabled extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateLabelEmpty extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateAllowedTypesEmpty extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateInvalidAllowedType extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplatePointsLessThanZero extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplatePointsTooLarge extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateOrderLessThanZero extends InsertNewUploadSlotTemplateError { }
export class InsertNewUploadSlotTemplateOrderTooLarge extends InsertNewUploadSlotTemplateError { }

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
        return failure(new InsertNewUploadSlotTemplatePartNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new InsertNewUploadSlotTemplateSubmissionsEnabled());
      }

      // validate the data
      if (label.length === 0) {
        return failure(new InsertNewUploadSlotTemplateLabelEmpty());
      }

      if (allowedTypes.length === 0) {
        return failure(new InsertNewUploadSlotTemplateAllowedTypesEmpty());
      }
      for (const allowedType of allowedTypes) {
        if (![ 'image', 'pdf', 'word', 'excel' ].includes(allowedType)) {
          return failure(new InsertNewUploadSlotTemplateInvalidAllowedType());
        }
      }

      if (points < 0) {
        return failure(new InsertNewUploadSlotTemplatePointsLessThanZero());
      }
      if (points > 127) {
        return failure(new InsertNewUploadSlotTemplatePointsTooLarge());
      }

      if (order < 0) {
        return failure(new InsertNewUploadSlotTemplateOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new InsertNewUploadSlotTemplateOrderTooLarge());
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

      return success({
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
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
