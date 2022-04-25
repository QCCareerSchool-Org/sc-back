import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { NewPartDTO } from '../../domain/newPartDTO';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { NewTextBoxDTO } from '../../domain/newTextBoxDTO';
import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetNewAssignmentRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = NewAssignmentDTO & {
  newAssignmentMedia: NewAssignmentMediumDTO[];
  newParts: Array<NewPartDTO & {
    newTextBoxes: NewTextBoxDTO[];
    newUploadSlots: NewUploadSlotDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }

export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          unitId: this.uuidService.uuidToBin(unitId),
          newUnit: { enrollment: { studentId, courseId, course: { enabled: true } } },
        },
        include: {
          newUnit: true,
          newAssignmentMedia: { include: { newAssignmentMedium: true }, orderBy: { order: 'asc' } },
          newParts: {
            orderBy: { partNumber: 'asc' },
            include: {
              newTextBoxes: { orderBy: { order: 'asc' } },
              newUploadSlots: { orderBy: { order: 'asc' } },
              newPartMedia: { include: { newPartMedium: true }, orderBy: { order: 'asc' } },
            },
          },
        },
      });

      if (!assignment) {
        return Result.fail(new GetNewAssignmentNotFound());
      }

      let assignmentComplete = true;
      let assignmentMarked = true;
      let assignmentPoints = 0;
      let assignmentMark = 0;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        unitId: this.uuidService.binToUUID(assignment.unitId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: assignment.optional,
        created: assignment.created,
        modified: assignment.modified,
        newAssignmentMedia: assignment.newAssignmentMedia.map(m => ({
          assignmentMediumId: this.uuidService.binToUUID(m.newAssignmentMedium.assignmentMediumId),
          assignmentTemplateId: m.newAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(m.newAssignmentMedium.assignmentTemplateId),
          mimeTypeId: m.newAssignmentMedium.mimeTypeId,
          type: m.newAssignmentMedium.type,
          filename: m.newAssignmentMedium.filename,
          filesize: m.newAssignmentMedium.filesize,
          caption: m.newAssignmentMedium.caption,
          externalData: m.newAssignmentMedium.externalData,
          order: m.order, // from the join table
          created: m.newAssignmentMedium.created,
          modified: m.newAssignmentMedium.modified,
        })),
        newParts: assignment.newParts.map(p => {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          const part = {
            partId: this.uuidService.binToUUID(p.partId),
            assignmentId: this.uuidService.binToUUID(p.assignmentId),
            partNumber: p.partNumber,
            title: p.title,
            description: p.description,
            descriptionType: p.descriptionType,
            markingCriteria: null, // students should never see the marking criteria
            markingComments: null, // students should never see the marking comments
            created: p.created,
            modified: p.modified,
            newTextBoxes: p.newTextBoxes.map(t => {
              const textBoxComplete = t.text.length > 0;
              if (!textBoxComplete && !t.optional) {
                partComplete = false;
              }
              if (textBoxComplete && t.mark === null && t.points > 0) {
                partMarked = false;
              }
              // ignore incomplete, optional inputs
              if (textBoxComplete || !t.optional) {
                partPoints += t.points;
                partMark += t.mark ?? 0;
              }
              return {
                textBoxId: this.uuidService.binToUUID(t.textBoxId),
                partId: this.uuidService.binToUUID(t.partId),
                description: t.description,
                lines: t.lines,
                points: t.points,
                mark: assignment.newUnit.closed ? t.mark : null, // hide the mark unless the unit is marked
                notes: null, // students should never see the tutor's notes
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: textBoxComplete,
                created: t.created,
                modified: t.modified,
              };
            }),
            newUploadSlots: p.newUploadSlots.map(u => {
              const uploadSlotComplete = u.filename !== null;
              if (!uploadSlotComplete && !u.optional) {
                partComplete = false;
              }
              if (uploadSlotComplete && u.mark === null && u.points > 0) {
                partMarked = false;
              }
              // ignore incomplete, optional inputs
              if (uploadSlotComplete || !u.optional) {
                partPoints += u.points;
                partMark += u.mark ?? 0;
              }
              return {
                uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                partId: this.uuidService.binToUUID(u.partId),
                label: u.label,
                allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                points: u.points,
                mark: assignment.newUnit.closed ? u.mark : null, // hide the mark unless the unit is marked
                notes: null, // students should never see the tutor's notes
                optional: u.optional,
                order: u.order,
                filename: u.filename,
                filesize: u.filesize,
                mimeTypeId: u.mimeTypeId,
                complete: uploadSlotComplete,
                created: u.created,
                modified: u.modified,
              };
            }),
            newPartMedia: p.newPartMedia.map(m => ({
              partMediumId: this.uuidService.binToUUID(m.partMediumId),
              partTemplateId: m.newPartMedium.partTemplateId === null ? null : this.uuidService.binToUUID(m.newPartMedium.partTemplateId),
              mimeTypeId: m.newPartMedium.mimeTypeId,
              type: m.newPartMedium.type,
              filename: m.newPartMedium.filename,
              filesize: m.newPartMedium.filesize,
              caption: m.newPartMedium.caption,
              externalData: m.newPartMedium.externalData,
              order: m.order, // from the join table
              created: m.newPartMedium.created,
              modified: m.newPartMedium.modified,
            })),
            complete: partComplete,
            points: partPoints,
            mark: assignment.newUnit.closed && partMarked ? partMark : null,
          };
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
          return part;
        }),
        complete: assignmentComplete,
        points: assignmentPoints,
        mark: assignment.newUnit.closed && assignmentMarked ? assignmentMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
