import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUploadSlotTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  uploadSlotId: string;
};

export type GetNewUploadSlotTemplateResponseDTO = NewUploadSlotTemplateDTO & {
  part: NewPartTemplateDTO;
};

export class GetNewUploadSlotTemplateNotFound extends Error { }

export class GetNewUploadSlotTemplateInteractor implements IInteractor<GetNewUploadSlotTemplateRequestDTO, GetNewUploadSlotTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, partId, uploadSlotId }: GetNewUploadSlotTemplateRequestDTO): Promise<ResultType<GetNewUploadSlotTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);
      const uploadSlotIdBin = this.uuidService.uuidToBin(uploadSlotId);

      const uploadSlot = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotId: uploadSlotIdBin, part: { partId: partIdBin, assignment: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } } } },
        include: { part: true },
      });
      if (!uploadSlot) {
        return Result.fail(new GetNewUploadSlotTemplateNotFound());
      }

      return Result.success({
        uploadSlotId: this.uuidService.binToUUID(uploadSlot.uploadSlotId),
        partId: this.uuidService.binToUUID(uploadSlot.partId),
        label: uploadSlot.label,
        allowedTypes: uploadSlot.allowedTypes.split(',') as NewUploadSlotAllowedType[],
        points: uploadSlot.points,
        optional: uploadSlot.optional,
        order: uploadSlot.order,
        created: uploadSlot.created,
        modified: uploadSlot.modified,
        part: {
          partId: this.uuidService.binToUUID(uploadSlot.part.partId),
          assignmentId: this.uuidService.binToUUID(uploadSlot.part.assignmentId),
          partNumber: uploadSlot.part.partNumber,
          title: uploadSlot.part.title,
          description: uploadSlot.part.description,
          optional: uploadSlot.part.optional,
          created: uploadSlot.part.created,
          modified: uploadSlot.part.modified,
        },
      });

    } catch (err) {
      this.logger.error('error getting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
