import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewPartMediumRequestDTO = {
  mediumId: string;
  caption: string;
  order: number;
};

export type SaveNewPartMediumResponseDTO = NewPartMediumDTO;

export class SaveNewPartMediumNotFound extends Error { }
export class SaveNewPartMediumSubmissionsEnabled extends Error { }
export class SaveNewPartMediumPartCaptionEmpty extends Error { }
export class SaveNewPartMediumPartCaptionTooLong extends Error { }
export class SaveNewPartMediumOrderLessThanZero extends Error { }
export class SaveNewPartMediumOrderTooLarge extends Error { }

export class SaveNewPartMediumInteractor implements IInteractor<SaveNewPartMediumRequestDTO, SaveNewPartMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ mediumId, caption, order }: SaveNewPartMediumRequestDTO): Promise<ResultType<SaveNewPartMediumResponseDTO>> {
    try {
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the part medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!partMedium) {
        return failure(new SaveNewPartMediumNotFound());
      }

      if (partMedium.newPartTemplate?.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewPartMediumSubmissionsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return failure(new SaveNewPartMediumPartCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
        return failure(new SaveNewPartMediumPartCaptionTooLong());
      }

      if (order < 0) {
        return failure(new SaveNewPartMediumOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new SaveNewPartMediumOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the part medium
      const updatedPartMedium = await this.prisma.newPartMedium.update({
        data: { caption, order, modified: prismaNow },
        where: { partMediumId: mediumIdBin },
      });

      return success({
        partMediumId: this.uuidService.binToUUID(updatedPartMedium.partMediumId),
        partTemplateId: updatedPartMedium.partTemplateId === null ? null : this.uuidService.binToUUID(updatedPartMedium.partTemplateId),
        mimeTypeId: updatedPartMedium.mimeTypeId,
        type: updatedPartMedium.type,
        filename: updatedPartMedium.filename,
        filesize: updatedPartMedium.filesize,
        caption: updatedPartMedium.caption,
        externalData: updatedPartMedium.externalData,
        order: updatedPartMedium.order,
        created: this.dateService.fixPrismaReadDate(updatedPartMedium.created),
        modified: this.dateService.fixPrismaReadDate(updatedPartMedium.modified),
      });

    } catch (err) {
      this.logger.error('error saving part medium', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
