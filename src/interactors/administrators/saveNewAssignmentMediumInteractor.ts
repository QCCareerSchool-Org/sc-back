import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { DateService } from '../../services/date/dateService.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewAssignmentMediumRequestDTO = {
  mediumId: string;
  caption: string;
  order: number;
};

export type SaveNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO;

export class SaveNewAssignmentMediumNotFound extends Error { }
export class SaveNewAssignmentMediumSubmissionsEnabled extends Error { }
export class SaveNewAssignmentMediumPartCaptionEmpty extends Error { }
export class SaveNewAssignmentMediumPartCaptionTooLong extends Error { }
export class SaveNewAssignmentMediumOrderLessThanZero extends Error { }
export class SaveNewAssignmentMediumOrderTooLarge extends Error { }

export class SaveNewAssignmentMediumInteractor implements IInteractor<SaveNewAssignmentMediumRequestDTO, SaveNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: DateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewAssignmentMediumRequestDTO): Promise<ResultType<SaveNewAssignmentMediumResponseDTO>> {
    try {
      const { caption, order } = request;
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the part medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin },
        include: {
          newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } },
        },
      });
      if (!assignmentMedium) {
        return failure(new SaveNewAssignmentMediumNotFound());
      }

      if (assignmentMedium.newAssignmentTemplate?.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new SaveNewAssignmentMediumSubmissionsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return failure(new SaveNewAssignmentMediumPartCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
        return failure(new SaveNewAssignmentMediumPartCaptionTooLong());
      }

      if (order < 0) {
        return failure(new SaveNewAssignmentMediumOrderLessThanZero());
      }
      if (order > 127) {
        return failure(new SaveNewAssignmentMediumOrderTooLarge());
      }

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // update the part medium
      const updatedAssignmentMedium = await this.prisma.newAssignmentMedium.update({
        data: { caption, order, modified: prismaNow },
        where: { assignmentMediumId: mediumIdBin },
      });

      return success({
        assignmentMediumId: this.uuidService.binToUUID(updatedAssignmentMedium.assignmentMediumId),
        assignmentTemplateId: updatedAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(updatedAssignmentMedium.assignmentTemplateId),
        mimeTypeId: updatedAssignmentMedium.mimeTypeId,
        type: updatedAssignmentMedium.type,
        filename: updatedAssignmentMedium.filename,
        filesize: updatedAssignmentMedium.filesize,
        caption: updatedAssignmentMedium.caption,
        externalData: updatedAssignmentMedium.externalData,
        order: updatedAssignmentMedium.order,
        created: this.dateService.fixPrismaReadDate(updatedAssignmentMedium.created),
        modified: this.dateService.fixPrismaReadDate(updatedAssignmentMedium.modified),
      });

    } catch (err) {
      this.logger.error('error saving assignment medium', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
