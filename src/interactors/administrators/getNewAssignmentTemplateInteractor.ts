import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewAssignmentTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  withInputs: boolean;
};

export type GetNewAssignmentTemplateResponseDTO = NewAssignmentTemplateDTO & {
  newUnitTemplate: NewUnitTemplateDTO;
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
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, withInputs }: GetNewAssignmentTemplateRequestDTO): Promise<ResultType<GetNewAssignmentTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);

      // find the assignment template
      const assignmentTemplate = await this.prisma.newAssignmentTemplate.findFirst({
        where: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } },
        include: {
          newUnitTemplate: true,
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
        unitTemplateId: this.uuidService.binToUUID(assignmentTemplate.unitTemplateId),
        assignmentNumber: assignmentTemplate.assignmentNumber,
        title: assignmentTemplate.title,
        description: assignmentTemplate.description,
        optional: assignmentTemplate.optional,
        created: assignmentTemplate.created,
        modified: assignmentTemplate.modified,
        newUnitTemplate: {
          unitTemplateId: this.uuidService.binToUUID(assignmentTemplate.newUnitTemplate.unitTemplateId),
          courseId: assignmentTemplate.newUnitTemplate.courseId,
          unitLetter: assignmentTemplate.newUnitTemplate.unitLetter,
          title: assignmentTemplate.newUnitTemplate.title,
          description: assignmentTemplate.newUnitTemplate.description,
          optional: assignmentTemplate.newUnitTemplate.optional,
          order: assignmentTemplate.newUnitTemplate.order,
          enabled: assignmentTemplate.newUnitTemplate.enabled,
          created: assignmentTemplate.newUnitTemplate.created,
          modified: assignmentTemplate.newUnitTemplate.modified,
        },
        newPartTemplates: assignmentTemplate.newPartTemplates.map(p => ({
          partTemplateId: this.uuidService.binToUUID(p.partTemplateId),
          assignmentTemplateId: this.uuidService.binToUUID(p.assignmentTemplateId),
          partNumber: p.partNumber,
          title: p.title,
          description: p.description,
          descriptionType: p.descriptionType,
          created: p.created,
          modified: p.modified,
          newTextBoxTemplates: withInputs ? p.newTextBoxTemplates.map(t => ({
            textBoxTemplateId: this.uuidService.binToUUID(t.textBoxTemplateId),
            partTemplateId: this.uuidService.binToUUID(t.partTemplateId),
            description: t.description,
            lines: t.lines,
            points: t.points,
            optional: t.optional,
            order: t.order,
            created: t.created,
            modified: t.modified,
          })) : undefined,
          newUploadSlotTemplates: withInputs ? p.newUploadSlotTemplates.map(u => ({
            uploadSlotTemplateId: this.uuidService.binToUUID(u.uploadSlotTemplateId),
            partTemplateId: this.uuidService.binToUUID(u.partTemplateId),
            label: u.label,
            allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
            points: u.points,
            optional: u.optional,
            order: u.order,
            created: u.created,
            modified: u.modified,
          })) : undefined,
          newPartMedia: withInputs ? p.newPartMedia.map(m => ({
            partMediumId: this.uuidService.binToUUID(m.partMediumId),
            partTemplateId: m.partTemplateId === null ? null : this.uuidService.binToUUID(m.partTemplateId),
            mimeTypeId: m.mimeTypeId,
            type: m.type,
            filename: m.filename,
            caption: m.caption,
            externalData: m.externalData,
            size: m.size,
            order: m.order,
            created: m.created,
            modified: m.modified,
          })) : undefined,
        })),
        newAssignmentMedia: assignmentTemplate.newAssignmentMedia.map(m => ({
          assignmentMediumId: this.uuidService.binToUUID(m.assignmentMediumId),
          assignmentTemplateId: m.assignmentTemplateId === null ? null : this.uuidService.binToUUID(m.assignmentTemplateId),
          mimeTypeId: m.mimeTypeId,
          type: m.type,
          filename: m.filename,
          caption: m.caption,
          externalData: m.externalData,
          size: m.size,
          order: m.order,
          created: m.created,
          modified: m.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting assignment template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
