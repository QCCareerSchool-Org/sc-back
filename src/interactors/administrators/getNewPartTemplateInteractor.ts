import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { NewTextBoxTemplateDTO } from '../../domain/newTextBoxTemplateDTO';
import type { NewUploadSlotAllowedType, NewUploadSlotTemplateDTO } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
};

export type GetNewPartTemplateResponseDTO = NewPartTemplateDTO & {
  assignment: NewAssignmentTemplateDTO;
  textBoxes: NewTextBoxTemplateDTO[];
  uploadSlots: NewUploadSlotTemplateDTO[];
};

export class GetNewPartTemplateNotFound extends Error { }

export class GetNewPartTemplateInteractor implements IInteractor<GetNewPartTemplateRequestDTO, GetNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, partId }: GetNewPartTemplateRequestDTO): Promise<ResultType<GetNewPartTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);

      const part = await this.prisma.newPartTemplate.findFirst({
        where: { partId: partIdBin, assignment: { assignmentId: assignmentIdBin, unit: { unitId: unitIdBin, course: { courseId, schoolId } } } },
        include: {
          assignment: true,
          textBoxes: {
            orderBy: [ { order: 'asc' } ],
          },
          uploadSlots: {
            orderBy: [ { order: 'asc' } ],
          },
        },
      });
      if (!part) {
        return Result.fail(new GetNewPartTemplateNotFound());
      }

      return Result.success({
        partId: this.uuidService.binToUUID(part.partId),
        assignmentId: this.uuidService.binToUUID(part.assignmentId),
        partNumber: part.partNumber,
        title: part.title,
        description: part.description,
        optional: part.optional,
        created: part.created,
        modified: part.modified,
        assignment: {
          assignmentId: this.uuidService.binToUUID(part.assignment.assignmentId),
          unitId: this.uuidService.binToUUID(part.assignment.unitId),
          assignmentNumber: part.assignment.assignmentNumber,
          title: part.assignment.title,
          description: part.assignment.description,
          optional: part.assignment.optional,
          created: part.assignment.created,
          modified: part.assignment.modified,
        },
        textBoxes: part.textBoxes.map(t => ({
          textBoxId: this.uuidService.binToUUID(t.textBoxId),
          partId: this.uuidService.binToUUID(t.partId),
          description: t.description,
          lines: t.lines,
          points: t.points,
          optional: t.optional,
          order: t.order,
          created: t.created,
          modified: t.modified,
        })),
        uploadSlots: part.uploadSlots.map(u => ({
          uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
          partId: this.uuidService.binToUUID(u.partId),
          label: u.label,
          allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
          points: u.points,
          optional: u.optional,
          order: u.order,
          created: u.created,
          modified: u.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
