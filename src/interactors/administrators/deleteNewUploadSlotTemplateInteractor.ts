import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type DeleteNewUploadSlotTemplateRequestDTO = {
  uploadSlotId: string;
};

export type DeleteNewUploadSlotTemplateResponseDTO = void;

export class DeleteNewUploadSlotTemplateNotFound extends Error { }
export class DeleteNewUploadSlotTemplateUnitsEnabled extends Error { }

export class DeleteNewUploadSlotTemplateInteractor implements IInteractor<DeleteNewUploadSlotTemplateRequestDTO, DeleteNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ uploadSlotId }: DeleteNewUploadSlotTemplateRequestDTO): Promise<ResultType<DeleteNewUploadSlotTemplateResponseDTO>> {
    try {
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      // find the upload slot template
      const uploadSlotTemplate = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotTemplateId: uploadSlotIdBin },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!uploadSlotTemplate) {
        return Result.fail(new DeleteNewUploadSlotTemplateNotFound());
      }

      if (uploadSlotTemplate.newPartTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewUploadSlotTemplateUnitsEnabled());
      }

      // delete the upload slot template
      await this.prisma.newUploadSlotTemplate.delete({ where: { uploadSlotTemplateId: uploadSlotIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
