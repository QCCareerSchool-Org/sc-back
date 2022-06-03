import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type SaveNewAssignmentMediumRequestDTO = {
  mediumId: string;
  caption: string;
  order: number;
};

export type SaveNewAssignmentMediumResponseDTO = NewAssignmentMediumDTO;

export class SaveNewAssignmentMediumNotFound extends Error { }
export class SaveNewAssignmentMediumUnitsEnabled extends Error { }
export class SaveNewAssignmentMediumPartCaptionEmpty extends Error { }
export class SaveNewAssignmentMediumPartCaptionTooLong extends Error { }
export class SaveNewAssignmentMediumOrderLessThanZero extends Error { }
export class SaveNewAssignmentMediumOrderTooLarge extends Error { }

export class SaveNewAssignmentMediumInteractor implements IInteractor<SaveNewAssignmentMediumRequestDTO, SaveNewAssignmentMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
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
          newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } },
        },
      });
      if (!assignmentMedium) {
        return Result.fail(new SaveNewAssignmentMediumNotFound());
      }

      if (assignmentMedium.newAssignmentTemplate?.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewAssignmentMediumUnitsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new SaveNewAssignmentMediumPartCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
        return Result.fail(new SaveNewAssignmentMediumPartCaptionTooLong());
      }

      if (order < 0) {
        return Result.fail(new SaveNewAssignmentMediumOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewAssignmentMediumOrderTooLarge());
      }

      // update the part medium
      const updatedAssignmentMedium = await this.prisma.newAssignmentMedium.update({
        data: { caption, order },
        where: { assignmentMediumId: mediumIdBin },
      });

      return Result.success({
        assignmentMediumId: this.uuidService.binToUUID(updatedAssignmentMedium.assignmentMediumId),
        assignmentTemplateId: updatedAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(updatedAssignmentMedium.assignmentTemplateId),
        mimeTypeId: updatedAssignmentMedium.mimeTypeId,
        type: updatedAssignmentMedium.type,
        filename: updatedAssignmentMedium.filename,
        filesize: updatedAssignmentMedium.filesize,
        caption: updatedAssignmentMedium.caption,
        externalData: updatedAssignmentMedium.externalData,
        order: updatedAssignmentMedium.order,
        created: updatedAssignmentMedium.created,
        modified: updatedAssignmentMedium.modified,
      });

    } catch (err) {
      this.logger.error('error saving assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
