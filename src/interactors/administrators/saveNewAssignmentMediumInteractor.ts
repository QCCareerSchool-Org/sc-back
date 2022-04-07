import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewAssignmentMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  mediumId: string;
  data: {
    caption: string;
    order: number;
  };
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

  public async execute({ schoolId, courseId, unitId, assignmentId, mediumId, data }: SaveNewAssignmentMediumRequestDTO): Promise<ResultType<SaveNewAssignmentMediumResponseDTO>> {
    try {
      const { caption, order } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the part medium
      const assignmentMedium = await this.prisma.newAssignmentMedium.findFirst({
        where: { assignmentMediumId: mediumIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } },
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
