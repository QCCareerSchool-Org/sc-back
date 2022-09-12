import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO.js';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewPartTemplateRequestDTO = {
  partId: string;
};

export type GetNewPartTemplateResponseDTO = NewPartTemplateDTO & {
  newAssignmentTemplate: NewAssignmentTemplateDTO;
  newTextBoxTemplates: NewTextBoxTemplateDTO[];
  newUploadSlotTemplates: NewUploadSlotTemplateDTO[];
  newPartMedia: NewPartMediumDTO[];
};

export class GetNewPartTemplateNotFound extends Error { }

export class GetNewPartTemplateInteractor implements IInteractor<GetNewPartTemplateRequestDTO, GetNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ partId }: GetNewPartTemplateRequestDTO): Promise<ResultType<GetNewPartTemplateResponseDTO>> {
    try {
      const partIdBin = this.uuidService.uuidToBin(partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newAssignmentTemplate: true,
          newTextBoxTemplates: {
            orderBy: [ { order: 'asc' } ],
          },
          newUploadSlotTemplates: {
            orderBy: [ { order: 'asc' } ],
          },
          newPartMedia: true,
        },
      });
      if (!partTemplate) {
        return Result.fail(new GetNewPartTemplateNotFound());
      }

      return Result.success({
        partTemplateId: this.uuidService.binToUUID(partTemplate.partTemplateId),
        assignmentTemplateId: this.uuidService.binToUUID(partTemplate.assignmentTemplateId),
        partNumber: partTemplate.partNumber,
        title: partTemplate.title,
        description: partTemplate.description,
        descriptionType: partTemplate.descriptionType,
        markingCriteria: partTemplate.markingCriteria,
        created: partTemplate.created,
        modified: partTemplate.modified,
        newAssignmentTemplate: {
          assignmentTemplateId: this.uuidService.binToUUID(partTemplate.newAssignmentTemplate.assignmentTemplateId),
          submissionTemplateId: this.uuidService.binToUUID(partTemplate.newAssignmentTemplate.submissionTemplateId),
          assignmentNumber: partTemplate.newAssignmentTemplate.assignmentNumber,
          title: partTemplate.newAssignmentTemplate.title,
          description: partTemplate.newAssignmentTemplate.description,
          descriptionType: partTemplate.newAssignmentTemplate.descriptionType,
          markingCriteria: partTemplate.newAssignmentTemplate.markingCriteria,
          optional: partTemplate.newAssignmentTemplate.optional,
          created: partTemplate.newAssignmentTemplate.created,
          modified: partTemplate.newAssignmentTemplate.modified,
        },
        newTextBoxTemplates: partTemplate.newTextBoxTemplates.map(t => ({
          textBoxTemplateId: this.uuidService.binToUUID(t.textBoxTemplateId),
          partTemplateId: this.uuidService.binToUUID(t.partTemplateId),
          description: t.description,
          lines: t.lines,
          points: t.points,
          optional: t.optional,
          order: t.order,
          created: t.created,
          modified: t.modified,
        })),
        newUploadSlotTemplates: partTemplate.newUploadSlotTemplates.map(u => ({
          uploadSlotTemplateId: this.uuidService.binToUUID(u.uploadSlotTemplateId),
          partTemplateId: this.uuidService.binToUUID(u.partTemplateId),
          label: u.label,
          allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
          points: u.points,
          optional: u.optional,
          order: u.order,
          created: u.created,
          modified: u.modified,
        })),
        newPartMedia: partTemplate.newPartMedia.map(m => ({
          partMediumId: this.uuidService.binToUUID(m.partMediumId),
          partTemplateId: m.partTemplateId === null ? null : this.uuidService.binToUUID(m.partTemplateId),
          mimeTypeId: m.mimeTypeId,
          type: m.type,
          filename: m.filename,
          filesize: m.filesize,
          caption: m.caption,
          externalData: m.externalData,
          order: m.order,
          created: m.created,
          modified: m.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
