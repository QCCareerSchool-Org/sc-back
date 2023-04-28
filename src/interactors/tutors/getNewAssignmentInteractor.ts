import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewAssignmentDTO } from '../../domain/tutors/newAssignmentDTO.js';
import type { NewPartDTO } from '../../domain/tutors/newPartDTO.js';
import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { NewTextBoxDTO } from '../../domain/tutors/newTextBoxDTO.js';
import type { NewUploadSlotDTO } from '../../domain/tutors/newUploadSlotDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type GetNewAssignmentRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = NewAssignmentDTO & {
  newSubmission: Omit<NewSubmissionDTO, 'complete' | 'points' | 'mark'>;
  newAssignmentMedia: NewAssignmentMediumDTO[];
  newParts: Array<NewPartDTO & {
    newTextBoxes: NewTextBoxDTO[];
    newUploadSlots: NewUploadSlotDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }
export class GetNewAssignmentSubmissionNotSubmitted extends Error { }
export class GetNewAssignmentSubmissionSkipped extends Error { }
export class GetNewAssignmentWrongTutor extends Error { }

/**
 * Should only consider the tutor's marks, not mark overrides.
 */
export class GetNewAssignmentInteractor implements IInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const newAssignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          newSubmission: {
            submissionId: this.uuidService.uuidToBin(submissionId),
            enrollment: { studentId },
          },
        },
        include: {
          newSubmission: { include: { enrollment: { include: { newSubmissions: true, oldSubmissions: true } } } },
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

      if (!newAssignment.newSubmission.submitted) {
        return Result.fail(new GetNewAssignmentSubmissionNotSubmitted());
      }

      if (newAssignment.newSubmission.skipped) {
        return Result.fail(new GetNewAssignmentSubmissionSkipped());
      }

      const isThisSubmissionsTutor = newAssignment.newSubmission.tutorId === tutorId;
      const isThisEnrollmentsTutor = newAssignment.newSubmission.enrollment.tutorId === tutorId;
      const hasAnotherSubmissionToMark = newAssignment.newSubmission.enrollment.newSubmissions.some(s => s.submitted && !s.skipped && !s.closed && s.tutorId === tutorId) || newAssignment.newSubmission.enrollment.oldSubmissions.some(s => s.finalizedDate !== null && !s.skipped && s.markedDate === null && s.tutorId === tutorId);

      if (!isThisSubmissionsTutor && !isThisEnrollmentsTutor && !hasAnotherSubmissionToMark) {
        return Result.fail(new GetNewAssignmentWrongTutor());
      }

      let assignmentComplete = true;
      let assignmentMarked = true;
      let assignmentPoints = 0;
      let assignmentMark = 0;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(newAssignment.assignmentId),
        submissionId: this.uuidService.binToUUID(newAssignment.submissionId),
        assignmentNumber: newAssignment.assignmentNumber,
        title: newAssignment.title,
        description: newAssignment.description,
        descriptionType: newAssignment.descriptionType,
        markingCriteria: newAssignment.markingCriteria,
        optional: newAssignment.optional,
        created: this.dateService.fixPrismaReadDate(newAssignment.created),
        modified: this.dateService.fixPrismaReadDate(newAssignment.modified),
        newSubmission: {
          submissionId: this.uuidService.binToUUID(newAssignment.newSubmission.submissionId),
          enrollmentId: newAssignment.newSubmission.enrollmentId,
          tutorId: newAssignment.newSubmission.tutorId,
          unitLetter: newAssignment.newSubmission.unitLetter,
          title: newAssignment.newSubmission.title,
          description: newAssignment.newSubmission.description,
          markingCriteria: newAssignment.newSubmission.markingCriteria,
          optional: newAssignment.newSubmission.optional,
          order: newAssignment.newSubmission.order,
          tutorComment: newAssignment.newSubmission.tutorComment,
          adminComment: newAssignment.newSubmission.adminComment,
          submitted: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.submitted),
          transferred: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.transferred),
          closed: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.closed),
          skipped: newAssignment.newSubmission.skipped,
          responseFilename: newAssignment.newSubmission.responseFilename,
          responseFilesize: newAssignment.newSubmission.responseFilesize,
          responseMimeTypeId: newAssignment.newSubmission.responseMimeTypeId,
          created: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.created),
          modified: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.modified),
          enrollment: {
            enrollmentId: newAssignment.newSubmission.enrollment.enrollmentId,
            courseId: newAssignment.newSubmission.enrollment.courseId,
            studentNumber: newAssignment.newSubmission.enrollment.studentNumber,
            tutorId: newAssignment.newSubmission.enrollment.tutorId,
            maxAssignments: newAssignment.newSubmission.enrollment.maxAssignments,
            graduated: newAssignment.newSubmission.enrollment.graduated,
            assignmentsDisabled: newAssignment.newSubmission.enrollment.assignmentsDisabled,
            quizzesDisabled: newAssignment.newSubmission.enrollment.quizzesDisabled,
            onHold: newAssignment.newSubmission.enrollment.onHold,
            holdReason: newAssignment.newSubmission.enrollment.holdReason,
            currencyCode: newAssignment.newSubmission.enrollment.currencyCode,
            courseCost: newAssignment.newSubmission.enrollment.courseCost.toNumber(),
            amountPaid: newAssignment.newSubmission.enrollment.amountPaid.toNumber(),
            monthlyInstallment: newAssignment.newSubmission.enrollment.monthlyInstallment === null ? null : newAssignment.newSubmission.enrollment.monthlyInstallment.toNumber(),
            enrollmentDate: this.dateService.fixPrismaReadDate(newAssignment.newSubmission.enrollment.enrollmentDate),
            fastTrack: newAssignment.newSubmission.enrollment.fastTrack,
            paymentsDisabled: newAssignment.newSubmission.enrollment.paymentsDisabled,
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
          created: this.dateService.fixPrismaReadDate(m.newAssignmentMedium.created),
          modified: this.dateService.fixPrismaReadDate(m.newAssignmentMedium.modified),
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
            created: this.dateService.fixPrismaReadDate(p.created),
            modified: this.dateService.fixPrismaReadDate(p.modified),
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
                mark: t.mark,
                notes: t.notes,
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: t.text.length > 0,
                created: this.dateService.fixPrismaReadDate(t.created),
                modified: this.dateService.fixPrismaReadDate(t.modified),
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
                notes: u.notes,
                optional: u.optional,
                order: u.order,
                filename: u.filename,
                filesize: u.filesize,
                mimeTypeId: u.mimeTypeId,
                complete: u.filename !== null,
                created: this.dateService.fixPrismaReadDate(u.created),
                modified: this.dateService.fixPrismaReadDate(u.modified),
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
              created: this.dateService.fixPrismaReadDate(m.newPartMedium.created),
              modified: this.dateService.fixPrismaReadDate(m.newPartMedium.modified),
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
