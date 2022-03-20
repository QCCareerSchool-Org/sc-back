import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO';
import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO';
import type { NewPartDTO } from '../../domain/newPartDTO';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO';
import type { NewTextBoxDTO } from '../../domain/newTextBoxDTO';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetNewAssignmentRequestDTO = {
  tutorId: number;
  studentId: number;
  unitId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = NewAssignmentDTO & {
  newUnit: NewUnitDTO;
  newAssignmentMedia: NewAssignmentMediumDTO[];
  newParts: Array<NewPartDTO & {
    newTextBoxes: NewTextBoxDTO[];
    newUploadSlots: NewUploadSlotDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }
export class GetNewAssignmentWrongTutor extends Error { }

export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          newUnit: {
            unitId: this.uuidService.uuidToBin(unitId),
            enrollment: { studentId },
          },
        },
        include: {
          newUnit: { include: { enrollment: true } },
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

      if (assignment.newUnit.tutorId !== tutorId && assignment.newUnit.enrollment.tutorId !== tutorId) {
        return Result.fail(new GetNewAssignmentWrongTutor());
      }

      // let assignmentComplete = true;
      // let assignmentMarked = true;
      // let assignmentPoints = 0;
      // let assignmentMark = 0;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        unitId: this.uuidService.binToUUID(assignment.unitId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        optional: assignment.optional,
        complete: assignment.complete,
        points: assignment.points,
        mark: assignment.mark,
        created: assignment.created,
        modified: assignment.modified,
        newUnit: {
          unitId: this.uuidService.binToUUID(assignment.newUnit.unitId),
          enrollmentId: assignment.newUnit.enrollmentId,
          tutorId: assignment.newUnit.tutorId,
          unitLetter: assignment.newUnit.unitLetter,
          title: assignment.newUnit.title,
          description: assignment.newUnit.description,
          optional: assignment.newUnit.optional,
          order: assignment.newUnit.order,
          tutorComment: assignment.newUnit.tutorComment,
          adminComment: assignment.newUnit.adminComment,
          submitted: assignment.newUnit.submitted,
          skipped: assignment.newUnit.skipped,
          transferred: assignment.newUnit.transferred,
          marked: assignment.newUnit.marked,
          complete: assignment.newUnit.complete,
          points: assignment.newUnit.points,
          mark: assignment.newUnit.mark,
          created: assignment.newUnit.created,
          modified: assignment.newUnit.modified,
        },
        newAssignmentMedia: assignment.newAssignmentMedia.map(m => ({
          assignmentMediumId: this.uuidService.binToUUID(m.newAssignmentMedium.assignmentMediumId),
          assignmentTemplateId: m.newAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(m.newAssignmentMedium.assignmentTemplateId),
          mimeTypeId: m.newAssignmentMedium.mimeTypeId,
          type: m.newAssignmentMedium.type,
          filename: m.newAssignmentMedium.filename,
          caption: m.newAssignmentMedium.caption,
          externalData: m.newAssignmentMedium.externalData,
          size: m.newAssignmentMedium.size,
          order: m.order, // from the join table
          created: m.newAssignmentMedium.created,
          modified: m.newAssignmentMedium.modified,
        })),
        newParts: assignment.newParts.map(p => {
          // let partComplete = true;
          // let partMarked = true;
          // let partPoints = 0;
          // let partMark = 0;
          const part = {
            partId: this.uuidService.binToUUID(p.partId),
            assignmentId: this.uuidService.binToUUID(p.assignmentId),
            partNumber: p.partNumber,
            title: p.title,
            description: p.description,
            descriptionType: p.descriptionType,
            complete: p.complete,
            points: p.points,
            mark: p.mark,
            created: p.created,
            modified: p.modified,
            newTextBoxes: p.newTextBoxes.map(t => {
              // const textBoxComplete = t.text.length > 0;
              // if (!textBoxComplete && !t.optional) {
              //   partComplete = false;
              // }
              // if (textBoxComplete && t.mark === null) {
              //   partMarked = false;
              // }
              // // ignore incomplete, optional inputs
              // if (textBoxComplete || !t.optional) {
              //   partPoints += t.points;
              //   partMark += t.mark ?? 0;
              // }
              return {
                textBoxId: this.uuidService.binToUUID(t.textBoxId),
                partId: this.uuidService.binToUUID(t.partId),
                description: t.description,
                lines: t.lines,
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: t.complete,
                points: t.points,
                mark: t.mark,
                created: t.created,
                modified: t.modified,
              };
            }),
            newUploadSlots: p.newUploadSlots.map(u => {
              // const uploadSlotComplete = u.filename !== null;
              // if (!uploadSlotComplete && !u.optional) {
              //   partComplete = false;
              // }
              // if (uploadSlotComplete && u.mark === null) {
              //   partMarked = false;
              // }
              // // ignore incomplete, optional inputs
              // if (uploadSlotComplete || !u.optional) {
              //   partPoints += u.points;
              //   partMark += u.mark ?? 0;
              // }
              return {
                uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                partId: this.uuidService.binToUUID(u.partId),
                label: u.label,
                allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                points: u.points,
                mark: u.mark,
                optional: u.optional,
                order: u.order,
                filename: u.filename,
                size: u.size,
                mimeTypeId: u.mimeTypeId,
                complete: u.complete,
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
              caption: m.newPartMedium.caption,
              externalData: m.newPartMedium.externalData,
              size: m.newPartMedium.size,
              order: m.order, // from the join table
              created: m.newPartMedium.created,
              modified: m.newPartMedium.modified,
            })),
            // complete: assignment.newUnit.submitted ? partComplete : false, // hide the completion status if the unit is not submitted
          };
          // if (!partComplete) {
          //   assignmentComplete = false;
          // }
          // if (!partMarked) {
          //   assignmentMarked = false;
          // }
          // // parts can't be optional, so we always add these
          // assignmentPoints += partPoints;
          // assignmentMark += partMark;
          return part;
        }),
        // complete: assignment.newUnit.submitted ? assignmentComplete : false, // hide the completion status if the unit is not submitted
        // points: assignmentPoints,
        // mark: assignment.newUnit.submitted && assignmentMarked ? assignmentMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
