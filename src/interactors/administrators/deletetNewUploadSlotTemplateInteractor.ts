import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type DeleteNewUploadSlotTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  uploadSlotId: string;
};

export type DeleteNewUploadSlotTemplateResponseDTO = void;

export class DeleteNewUploadSlotTemplateNotFound extends Error { }

export class DeleteNewUploadSlotTemplateInteractor implements IInteractor<DeleteNewUploadSlotTemplateRequestDTO, DeleteNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewUploadSlotTemplateRequestDTO): Promise<ResultType<DeleteNewUploadSlotTemplateResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(request.uploadSlotId);

      // find the upload slot
      const uploadSlot = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, part: { partId: partIdBin, assignment: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } } } },
      });
      if (!uploadSlot) {
        return Result.fail(new DeleteNewUploadSlotTemplateNotFound());
      }

      // delete the upload slot
      await this.prisma.newUploadSlotTemplate.delete({ where: { uploadSlotId: uploadSlotIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
