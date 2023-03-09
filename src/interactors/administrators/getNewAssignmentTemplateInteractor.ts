import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO.js';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO.js';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewAssignmentTemplateRequestDTO = {
  assignmentId: string;
  withInputs: boolean;
};

export type GetNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO & {
  newSubmissionTemplate: NewSubmissionTemplateDTO;
  newPartTemplates: NewPartTemplateDTO[] | Array<NewPartTemplateDTO & {
    newTextBoxTemplates: NewTextBoxTemplateDTO[];
    newUploadSlotTemplates: NewUploadSlotTemplateDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
  newAssignmentMedia: NewAssignmentMediumDTO[];
};

export class GetNewAssignmentTemplateNotFound extends Error { }

export class GetNewAssignmentTemplateInteractor implements IInteractor<GetNewAssignmentTemplateRequestDTO, GetNewAssignmentTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ assignmentId, withInputs }: GetNewAssignmentTemplateRequestDTO): Promise<ResultType<GetNewAssignmentTemplateResponseDTO>> {
    try {
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin },
        include: {
          newSubmissionTemplate: true,
          newPartTemplates: {
            include: { newTextBoxTemplates: true, newUploadSlotTemplates: true, newPartMedia: true },
            orderBy: [ { partNumber: 'asc' } ],
          },
          newAssignmentMedia: true,
        },
      });
      if (!assignmentTemplate) {
        return Result.fail(new GetNewAssignmentTemplateNotFound());
      }

      return Result.success({
        assignmentTemplateId: this.uuidService.binToUUID(assignmentTemplate.assignmentTemplateId),
        submissionTemplateId: this.uuidService.binToUUID(assignmentTemplate.submissionTemplateId),
        assignmentNumber: assignmentTemplate.assignmentNumber,
        title: assignmentTemplate.title,
        description: assignmentTemplate.description,
        descriptionType: assignmentTemplate.descriptionType,
        markingCriteria: assignmentTemplate.markingCriteria,
        optional: assignmentTemplate.optional,
        created: this.dateService.fixPrismaReadDate(assignmentTemplate.created),
        modified: this.dateService.fixPrismaReadDate(assignmentTemplate.modified),
        newSubmissionTemplate: {
          submissionTemplateId: this.uuidService.binToUUID(assignmentTemplate.newSubmissionTemplate.submissionTemplateId),
          courseId: assignmentTemplate.newSubmissionTemplate.courseId,
          unitLetter: assignmentTemplate.newSubmissionTemplate.unitLetter,
          title: assignmentTemplate.newSubmissionTemplate.title,
          description: assignmentTemplate.newSubmissionTemplate.description,
          markingCriteria: assignmentTemplate.newSubmissionTemplate.markingCriteria,
          optional: assignmentTemplate.newSubmissionTemplate.optional,
          order: assignmentTemplate.newSubmissionTemplate.order,
          created: this.dateService.fixPrismaReadDate(assignmentTemplate.newSubmissionTemplate.created),
          modified: this.dateService.fixPrismaReadDate(assignmentTemplate.newSubmissionTemplate.modified),
        },
        newPartTemplates: assignmentTemplate.newPartTemplates.map(p => ({
          partTemplateId: this.uuidService.binToUUID(p.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(p.assignmentTemplateId),
          partNumber: p.partNumber,
          title: p.title,
          description: p.description,
          descriptionType: p.descriptionType,
          markingCriteria: p.markingCriteria,
          created: this.dateService.fixPrismaReadDate(p.created),
          modified: this.dateService.fixPrismaReadDate(p.modified),
          newTextBoxTemplates: withInputs ? p.newTextBoxTemplates.map(t => ({
            textBoxTemplateId: this.uuidService.binToUUID(t.textBoxTemplateId),
            partTemplateId: this.uuidService.binToUUID(t.partTemplateId),
            description: t.description,
            lines: t.lines,
            points: t.points,
            optional: t.optional,
            order: t.order,
            created: this.dateService.fixPrismaReadDate(t.created),
            modified: this.dateService.fixPrismaReadDate(t.modified),
          })) : undefined,
          newUploadSlotTemplates: withInputs ? p.newUploadSlotTemplates.map(u => ({
            uploadSlotTemplateId: this.uuidService.binToUUID(u.uploadSlotTemplateId),
            partTemplateId: this.uuidService.binToUUID(u.partTemplateId),
            label: u.label,
            allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
            points: u.points,
            optional: u.optional,
            order: u.order,
            created: this.dateService.fixPrismaReadDate(u.created),
            modified: this.dateService.fixPrismaReadDate(u.modified),
          })) : undefined,
          newPartMedia: withInputs ? p.newPartMedia.map(m => ({
            partMediumId: this.uuidService.binToUUID(m.partMediumId),
            partTemplateId: m.partTemplateId === null ? null : this.uuidService.binToUUID(m.partTemplateId),
            mimeTypeId: m.mimeTypeId,
            type: m.type,
            filename: m.filename,
            filesize: m.filesize,
            caption: m.caption,
            externalData: m.externalData,
            order: m.order,
            created: this.dateService.fixPrismaReadDate(m.created),
            modified: this.dateService.fixPrismaReadDate(m.modified),
          })) : undefined,
        })),
        newAssignmentMedia: assignmentTemplate.newAssignmentMedia.map(m => ({
          assignmentMediumId: this.uuidService.binToUUID(m.assignmentMediumId),
          assignmentTemplateId: m.assignmentTemplateId === null ? null : this.uuidService.binToUUID(m.assignmentTemplateId),
          mimeTypeId: m.mimeTypeId,
          type: m.type,
          filename: m.filename,
          filesize: m.filesize,
          caption: m.caption,
          externalData: m.externalData,
          order: m.order,
          created: this.dateService.fixPrismaReadDate(m.created),
          modified: this.dateService.fixPrismaReadDate(m.modified),
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
