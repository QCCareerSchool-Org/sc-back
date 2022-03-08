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
  newPartTemplate: NewPartTemplateDTO;
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

      // find the upload slot template
      const uploadSlotTemplate = await this.prisma.newUploadSlotTemplate.findFirst({
        where: { uploadSlotTemplateId: uploadSlotIdBin, newPartTemplate: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } } },
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
        created: uploadSlotTemplate.created,
        modified: uploadSlotTemplate.modified,
        newPartTemplate: {
          partTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.newPartTemplate.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(uploadSlotTemplate.newPartTemplate.assignmentTemplateId),
          partNumber: uploadSlotTemplate.newPartTemplate.partNumber,
          title: uploadSlotTemplate.newPartTemplate.title,
          description: uploadSlotTemplate.newPartTemplate.description,
          optional: uploadSlotTemplate.newPartTemplate.optional,
          created: uploadSlotTemplate.newPartTemplate.created,
          modified: uploadSlotTemplate.newPartTemplate.modified,
        },
      });

    } catch (err) {
      this.logger.error('error getting upload slot template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
