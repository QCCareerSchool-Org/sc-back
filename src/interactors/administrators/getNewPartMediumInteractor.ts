import type { PrismaClient } from '@prisma/client';

import type { NewPartDTO } from '../../domain/administrators/newPartDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewPartMediumRequestDTO = {
  mediumId: string;
};

export type GetNewPartMediumResponseDTO = NewPartMediumDTO & {
  newPartTemplate: NewPartTemplateDTO | null;
  newParts: Omit<NewPartDTO, 'complete' | 'points' | 'mark' | 'markOverride'>[];
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
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the part medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin },
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
        filesize: partMedium.filesize,
        caption: partMedium.caption,
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
          markingCriteria: partMedium.newPartTemplate.markingCriteria,
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
          markingCriteria: p.newPart.markingCriteria,
          markingComments: p.newPart.markingComments,
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
