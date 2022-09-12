import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewUploadSlotTemplateRequestDTO = {
  uploadSlotId: string;
};

export type DeleteNewUploadSlotTemplateResponseDTO = void;

export class DeleteNewUploadSlotTemplateNotFound extends Error { }
export class DeleteNewUploadSlotTemplateSubmissionsEnabled extends Error { }

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
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!uploadSlotTemplate) {
        return Result.fail(new DeleteNewUploadSlotTemplateNotFound());
      }

      if (uploadSlotTemplate.newPartTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return Result.fail(new DeleteNewUploadSlotTemplateSubmissionsEnabled());
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
