import type { PrismaClient } from '@prisma/client';

import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewUploadSlotTemplateRequestDTO = {
  uploadSlotId: string;
};

export type GetNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO & {
  newPartTemplate: NewPartTemplateDTO;
};

export class GetNewUploadSlotTemplateNotFound extends Error { }

export class GetNewUploadSlotTemplateInteractor implements IInteractor<GetNewUploadSlotTemplateRequestDTO, GetNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ uploadSlotId }: GetNewUploadSlotTemplateRequestDTO): Promise<ResultType<GetNewUploadSlotTemplateResponseDTO>> {
    try {
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      // find the upload slot template
      const uploadSlotTemplate = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotTemplateId: uploadSlotIdBin },
        include: { newPartTemplate: true },
      });
      if (!uploadSlotTemplate) {
        return Result.fail(new GetNewUploadSlotTemplateNotFound());
      }

      return Result.success({
        uploadSlotTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.uploadSlotTemplateId),
        partTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.partTemplateId),
        label: uploadSlotTemplate.label,
        allowedTypes: uploadSlotTemplate.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: uploadSlotTemplate.points,
        optional: uploadSlotTemplate.optional,
        order: uploadSlotTemplate.order,
        created: this.dateService.fixPrismaReadDate(uploadSlotTemplate.created),
        modified: this.dateService.fixPrismaReadDate(uploadSlotTemplate.modified),
        newPartTemplate: {
          partTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.newPartTemplate.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.newPartTemplate.assignmentTemplateId),
          partNumber: uploadSlotTemplate.newPartTemplate.partNumber,
          title: uploadSlotTemplate.newPartTemplate.title,
          description: uploadSlotTemplate.newPartTemplate.description,
          descriptionType: uploadSlotTemplate.newPartTemplate.descriptionType,
          markingCriteria: uploadSlotTemplate.newPartTemplate.markingCriteria,
          created: this.dateService.fixPrismaReadDate(uploadSlotTemplate.newPartTemplate.created),
          modified: this.dateService.fixPrismaReadDate(uploadSlotTemplate.newPartTemplate.modified),
        },
      });

    } catch (err) {
      this.logger.error('error getting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
