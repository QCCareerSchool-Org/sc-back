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
  newUnit: Omit<NewUnitDTO, 'complete' | 'points' | 'mark'>;
  newAssignmentMedia: NewAssignmentMediumDTO[];
  newParts: Array<NewPartDTO & {
    newTextBoxes: NewTextBoxDTO[];
    newUploadSlots: NewUploadSlotDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }
export class GetNewAssignmentUnitNotSubmitted extends Error { }
export class GetNewAssignmentWrongTutor extends Error { }

export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, unitId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const newAssignment = await this.prisma.newAssignment.findFirst({
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

      if (!newAssignment) {
        return Result.fail(new GetNewAssignmentNotFound());
      }

      if (!newAssignment.newUnit.submitted) {
        return Result.fail(new GetNewAssignmentUnitNotSubmitted());
      }

      if (newAssignment.newUnit.tutorId !== tutorId && newAssignment.newUnit.enrollment.tutorId !== tutorId) {
        return Result.fail(new GetNewAssignmentWrongTutor());
      }

      let assignmentComplete = true;
      let assignmentMarked = true;
      let assignmentPoints = 0;
      let assignmentMark = 0;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(newAssignment.assignmentId),
        unitId: this.uuidService.binToUUID(newAssignment.unitId),
        assignmentNumber: newAssignment.assignmentNumber,
        title: newAssignment.title,
        description: newAssignment.description,
        markingCriteria: newAssignment.markingCriteria,
        optional: newAssignment.optional,
        // complete: assignment.complete,
        // points: assignment.points,
        // mark: assignment.mark,
        created: newAssignment.created,
        modified: newAssignment.modified,
        newUnit: {
          unitId: this.uuidService.binToUUID(newAssignment.newUnit.unitId),
          enrollmentId: newAssignment.newUnit.enrollmentId,
          tutorId: newAssignment.newUnit.tutorId,
          unitLetter: newAssignment.newUnit.unitLetter,
          title: newAssignment.newUnit.title,
          description: newAssignment.newUnit.description,
          markingCriteria: newAssignment.newUnit.markingCriteria,
          optional: newAssignment.newUnit.optional,
          order: newAssignment.newUnit.order,
          tutorComment: newAssignment.newUnit.tutorComment,
          adminComment: newAssignment.newUnit.adminComment,
          submitted: newAssignment.newUnit.submitted,
          skipped: newAssignment.newUnit.skipped,
          transferred: newAssignment.newUnit.transferred,
          marked: newAssignment.newUnit.marked,
          responseFilename: newAssignment.newUnit.responseFilename,
          responseFilesize: newAssignment.newUnit.responseFilesize,
          responseMimeTypeId: newAssignment.newUnit.responseMimeTypeId,
          created: newAssignment.newUnit.created,
          modified: newAssignment.newUnit.modified,
          enrollment: {
            enrollmentId: newAssignment.newUnit.enrollment.enrollmentId,
            courseId: newAssignment.newUnit.enrollment.courseId,
            studentNumber: newAssignment.newUnit.enrollment.studentNumber,
            tutorId: newAssignment.newUnit.enrollment.tutorId,
            maxAssignments: newAssignment.newUnit.enrollment.maxAssignments,
            graduated: newAssignment.newUnit.enrollment.graduated,
            assignmentsDisabled: newAssignment.newUnit.enrollment.assignmentsDisabled,
            quizzesDisabled: newAssignment.newUnit.enrollment.quizzesDisabled,
            onHold: newAssignment.newUnit.enrollment.onHold,
            holdReason: newAssignment.newUnit.enrollment.holdReason,
            currencyCode: newAssignment.newUnit.enrollment.currencyCode,
            courseCost: newAssignment.newUnit.enrollment.courseCost.toNumber(),
            amountPaid: newAssignment.newUnit.enrollment.amountPaid.toNumber(),
            monthlyInstallment: newAssignment.newUnit.enrollment.monthlyInstallment === null ? null : newAssignment.newUnit.enrollment.monthlyInstallment.toNumber(),
            enrollmentDate: newAssignment.newUnit.enrollment.enrollmentDate,
            fastTrack: newAssignment.newUnit.enrollment.fastTrack,
            paymentsDisabled: newAssignment.newUnit.enrollment.paymentsDisabled,
          },
        },
        newAssignmentMedia: newAssignment.newAssignmentMedia.map(m => ({
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
        newParts: newAssignment.newParts.map(p => {
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
            markingCriteria: p.markingCriteria,
            markingComments: p.markingComments,
            // complete: p.complete,
            // points: p.points,
            // mark: p.mark,
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
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: t.text.length > 0,
                points: t.points,
                mark: t.mark,
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
                mark: u.mark,
                optional: u.optional,
                order: u.order,
                filename: u.filename,
                filesize: u.filesize,
                mimeTypeId: u.mimeTypeId,
                complete: u.filename !== null,
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
            mark: partMarked ? partMark : null,
          };
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (!partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
          return part;
        }),
        complete: assignmentComplete,
        points: assignmentPoints,
        mark: assignmentMarked ? assignmentMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
