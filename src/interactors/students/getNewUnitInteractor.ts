import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO';
import type { NewAssignmentDTO } from '../../domain/newAssignmentDTO';
import type { NewPartDTO } from '../../domain/newPartDTO';
import type { NewTextBoxDTO } from '../../domain/newTextBoxDTO';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { NewUploadSlotDTO } from '../../domain/newUploadSlotDTO';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unitId: string;
};

export type GetNewUnitResponseDTO = NewUnitDTO & {
  enrollment: EnrollmentDTO;
  newAssignments: Array<NewAssignmentDTO & {
    newParts: Array<NewPartDTO & {
      newTextBoxes: NewTextBoxDTO[];
      newUploadSlots: NewUploadSlotDTO[];
    }>;
  }>;
};

export class GetNewUnitNotFound extends Error { }

export class GetNewUnitInteractor implements IInteractor<GetNewUnitRequestDTO, GetNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId, unitId }: GetNewUnitRequestDTO): Promise<ResultType<GetNewUnitResponseDTO>> {
    try {
      const unit = await this.prisma.newUnit.findFirst({
        where: {
          enrollment: { studentId, courseId, course: { enabled: true } },
          unitId: this.uuidService.uuidToBin(unitId),
        },
        include: {
          enrollment: { include: { course: true } },
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
        },
      });

      if (!unit) {
        return Result.fail(new GetNewUnitNotFound());
      }

      let unitComplete = true;
      let unitMarked = true;
      let unitPoints = 0;
      let unitMark = 0;

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        enrollmentId: unit.enrollmentId,
        tutorId: unit.tutorId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: unit.optional,
        order: unit.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: unit.adminComment,
        submitted: unit.submitted,
        transferred: unit.transferred,
        closed: unit.closed,
        skipped: unit.skipped,
        responseFilename: unit.responseFilename === null ? null : `${unit.enrollment.course.code}${unit.enrollment.enrollmentId} Unit ${unit.unitLetter}.mp3`,
        responseFilesize: unit.responseFilesize,
        responseMimeTypeId: unit.responseMimeTypeId,
        created: unit.created,
        modified: unit.modified,
        enrollment: {
          enrollmentId: unit.enrollment.enrollmentId,
          courseId: unit.enrollment.courseId,
          studentId: unit.enrollment.studentId,
          studentNumber: unit.enrollment.studentNumber,
          tutorId: unit.enrollment.tutorId,
          maxAssignments: unit.enrollment.maxAssignments,
          graduated: unit.enrollment.graduated,
          assignmentsDisabled: unit.enrollment.assignmentsDisabled,
          quizzesDisabled: unit.enrollment.quizzesDisabled,
          onHold: unit.enrollment.onHold,
          holdReason: unit.enrollment.holdReason,
          currencyCode: unit.enrollment.currencyCode,
          courseCost: unit.enrollment.courseCost.toNumber(),
          amountPaid: unit.enrollment.amountPaid.toNumber(),
          monthlyInstallment: unit.enrollment.monthlyInstallment === null ? null : unit.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: unit.enrollment.enrollmentDate,
          fastTrack: unit.enrollment.fastTrack,
          paymentsDisabled: unit.enrollment.paymentsDisabled,
        },
        newAssignments: unit.newAssignments.map(a => {
          let assignmentComplete = true;
          let assignmentMarked = false;
          let assignmentPoints = 0;
          let assignmentMark = 0;
          const assignment = {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            unitId: this.uuidService.binToUUID(a.unitId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            markingCriteria: null, // students should never see the marking criteria
            optional: a.optional,
            created: a.created,
            modified: a.modified,
            newParts: a.newParts.map(p => {
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
                  if (!t.optional && !textBoxComplete) {
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
                    mark: t.mark,
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
                  if (!u.optional && !uploadSlotComplete) {
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
                complete: partComplete,
                points: partPoints,
                mark: unit.closed && partMark,
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
            mark: unit.closed && assignmentMarked ? assignmentMark : null,
          };
          if (!a.optional && !assignmentComplete) {
            unitComplete = false;
          }
          // ignore incomplete, optional assignments
          if (assignmentComplete || !a.optional) {
            unitPoints += assignmentPoints;
            unitMark += assignmentMark;
          }
          if (assignmentComplete && !assignmentMarked) {
            unitMarked = false;
          }
          return assignment;
        }),
        complete: unitComplete,
        points: unitPoints,
        mark: unit.closed && unitMarked ? unitMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
