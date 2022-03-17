import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewPartDTO } from '../../domain/newPartDTO';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewPartMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  mediumId: string;
};

export type GetNewPartMediumResponseDTO = NewPartMediumDTO & {
  newPartTemplate: NewPartTemplateDTO | null;
  newParts: NewPartDTO[];
};

export class GetNewPartMediumNotFound extends Error { }

export class GetNewPartMediumInteractor implements IInteractor<GetNewPartMediumRequestDTO, GetNewPartMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: GetNewPartMediumRequestDTO): Promise<ResultType<GetNewPartMediumResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the part medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin, newPartTemplate: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } } },
        include: {
          newPartTemplate: true,
          newParts: { include: { newPart: true } },
        },
      });
      if (!partMedium) {
        return Result.fail(new GetNewPartMediumNotFound());
      }

      return Result.success({
        partMediumId: this.uuidService.binToUUID(partMedium.partMediumId),
        partTemplateId: partMedium.partTemplateId === null ? null : this.uuidService.binToUUID(partMedium.partTemplateId),
        mimeTypeId: partMedium.mimeTypeId,
        type: partMedium.type,
        filename: partMedium.filename,
        caption: partMedium.caption,
        size: partMedium.size,
        order: partMedium.order,
        externalData: partMedium.externalData,
        created: partMedium.created,
        modified: partMedium.modified,
        newPartTemplate: partMedium.newPartTemplate === null ? null : {
          partTemplateId: this.uuidService.binToUUID(partMedium.newPartTemplate.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(partMedium.newPartTemplate.assignmentTemplateId),
          partNumber: partMedium.newPartTemplate.partNumber,
          title: partMedium.newPartTemplate.title,
          description: partMedium.newPartTemplate.description,
          descriptionType: partMedium.newPartTemplate.descriptionType,
          created: partMedium.newPartTemplate.created,
          modified: partMedium.newPartTemplate.modified,
        },
        newParts: partMedium.newParts.map(p => ({
          partId: this.uuidService.binToUUID(p.newPart.assignmentId),
          assignmentId: this.uuidService.binToUUID(p.newPart.assignmentId),
          partNumber: p.newPart.partNumber,
          title: p.newPart.title,
          description: p.newPart.description,
          descriptionType: p.newPart.descriptionType,
          complete: false, // we aren't going to calculate this, because we'd have to retreive all the inputs for each one
          created: p.newPart.created,
          modified: p.newPart.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
