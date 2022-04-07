import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type SaveNewPartMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  mediumId: string;
  data: {
    caption: string;
    order: number;
  };
};

export type SaveNewPartMediumResponseDTO = NewPartMediumDTO;

export class SaveNewPartMediumNotFound extends Error { }
export class SaveNewPartMediumUnitsEnabled extends Error { }
export class SaveNewPartMediumPartCaptionEmpty extends Error { }
export class SaveNewPartMediumPartCaptionTooLong extends Error { }
export class SaveNewPartMediumOrderLessThanZero extends Error { }
export class SaveNewPartMediumOrderTooLarge extends Error { }

export class SaveNewPartMediumInteractor implements IInteractor<SaveNewPartMediumRequestDTO, SaveNewPartMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, partId, mediumId, data }: SaveNewPartMediumRequestDTO): Promise<ResultType<SaveNewPartMediumResponseDTO>> {
    try {
      const { caption, order } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const mediumIdBin = this.uuidService.uuidToBin(mediumId);

      // find the part medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin, newPartTemplate: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } } },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!partMedium) {
        return Result.fail(new SaveNewPartMediumNotFound());
      }

      if (partMedium.newPartTemplate?.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new SaveNewPartMediumUnitsEnabled());
      }

      // validate the data
      if (caption.length === 0) {
        return Result.fail(new SaveNewPartMediumPartCaptionEmpty());
      }
      if ([ ...caption ].length > 191) {
        return Result.fail(new SaveNewPartMediumPartCaptionTooLong());
      }

      if (order < 0) {
        return Result.fail(new SaveNewPartMediumOrderLessThanZero());
      }
      if (order > 127) {
        return Result.fail(new SaveNewPartMediumOrderTooLarge());
      }

      // update the part medium
      const updatedPartMedium = await this.prisma.newPartMedium.update({
        data: { caption, order },
        where: { partMediumId: mediumIdBin },
      });

      return Result.success({
        partMediumId: this.uuidService.binToUUID(updatedPartMedium.partMediumId),
        partTemplateId: updatedPartMedium.partTemplateId === null ? null : this.uuidService.binToUUID(updatedPartMedium.partTemplateId),
        mimeTypeId: updatedPartMedium.mimeTypeId,
        type: updatedPartMedium.type,
        filename: updatedPartMedium.filename,
        filesize: updatedPartMedium.filesize,
        caption: updatedPartMedium.caption,
        externalData: updatedPartMedium.externalData,
        order: updatedPartMedium.order,
        created: updatedPartMedium.created,
        modified: updatedPartMedium.modified,
      });

    } catch (err) {
      this.logger.error('error saving part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
