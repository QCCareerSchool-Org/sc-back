import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentDTO } from '../../domain/administrators/newAssignmentDTO.js';
import type { NewPartDTO } from '../../domain/administrators/newPartDTO.js';
import type { NewSubmissionDTO } from '../../domain/administrators/newSubmissionDTO.js';
import type { NewTextBoxDTO } from '../../domain/administrators/newTextBoxDTO.js';
import type { NewUploadSlotDTO } from '../../domain/administrators/newUploadSlotDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetNewSubmissionRequestDTO = {
  submissionId: string;
};

export type GetNewSubmissionResponseDTO = NewSubmissionDTO & {
  enrollment: EnrollmentDTO & {
    course: CourseDTO;
  };
  newAssignments: Array<NewAssignmentDTO & {
    newParts: Array<NewPartDTO & {
      newTextBoxes: NewTextBoxDTO[];
      newUploadSlots: NewUploadSlotDTO[];
    }>;
  }>;
};

export class GetNewSubmissionNotFound extends Error { }

export class GetNewSubmissionInteractor implements IInteractor<GetNewSubmissionRequestDTO, GetNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionId }: GetNewSubmissionRequestDTO): Promise<ResultType<GetNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      // find the submission
      const submission = await this.prisma.newSubmission.findFirst({
        where: { submissionId: submissionIdBin },
        include: {
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
          enrollment: { include: { course: true } },
        },
      });
      if (!submission) {
        return Result.fail(new GetNewSubmissionNotFound());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;
      let submissionMarkOverride = 0;
      let submissionOverridden = false;

      return Result.success({
        submissionId: this.uuidService.binToUUID(submission.submissionId),
        enrollmentId: submission.enrollmentId,
        tutorId: submission.tutorId,
        unitLetter: submission.unitLetter,
        title: submission.title,
        description: submission.description,
        markingCriteria: submission.markingCriteria,
        optional: submission.optional,
        order: submission.order,
        tutorComment: submission.tutorComment,
        adminComment: submission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(submission.submitted),
        transferred: this.dateService.fixPrismaReadDate(submission.transferred),
        closed: this.dateService.fixPrismaReadDate(submission.closed),
        skipped: submission.skipped,
        responseFilename: submission.responseFilename === null ? null : `${submission.enrollment.course.code}${submission.enrollment.enrollmentId} Submission ${submission.unitLetter}.mp3`,
        responseFilesize: submission.responseFilesize,
        responseMimeTypeId: submission.responseMimeTypeId,
        created: this.dateService.fixPrismaReadDate(submission.created),
        modified: this.dateService.fixPrismaReadDate(submission.modified),
        enrollment: {
          enrollmentId: submission.enrollment.enrollmentId,
          courseId: submission.enrollment.courseId,
          studentId: submission.enrollment.studentId,
          studentNumber: submission.enrollment.studentNumber,
          tutorId: submission.enrollment.tutorId,
          maxAssignments: submission.enrollment.maxAssignments,
          graduated: submission.enrollment.graduated,
          assignmentsDisabled: submission.enrollment.assignmentsDisabled,
          quizzesDisabled: submission.enrollment.quizzesDisabled,
          onHold: submission.enrollment.onHold,
          holdReason: submission.enrollment.holdReason,
          currencyCode: submission.enrollment.currencyCode,
          courseCost: submission.enrollment.courseCost.toNumber(),
          amountPaid: submission.enrollment.amountPaid.toNumber(),
          monthlyInstallment: submission.enrollment.monthlyInstallment === null ? null : submission.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: this.dateService.fixPrismaReadDate(submission.enrollment.enrollmentDate),
          fastTrack: submission.enrollment.fastTrack,
          paymentsDisabled: submission.enrollment.paymentsDisabled,
          course: {
            courseId: submission.enrollment.course.courseId,
            schoolId: submission.enrollment.course.schoolId,
            code: submission.enrollment.course.code,
            version: submission.enrollment.course.version,
            studentTypeId: submission.enrollment.course.studentTypeId,
            name: submission.enrollment.course.name,
            courseGuide: submission.enrollment.course.courseGuide,
            quizzesEnabled: submission.enrollment.course.quizzesEnabled,
            noTutor: submission.enrollment.course.noTutor,
            submissionType: submission.enrollment.course.submissionType,
            order: submission.enrollment.course.order,
            enabled: submission.enrollment.course.enabled,
            submissionsEnabled: submission.enrollment.course.submissionsEnabled,
            entityVersion: submission.enrollment.course.entityVersion,
          },
        },
        newAssignments: submission.newAssignments.map(a => {
          let assignmentComplete = true;
          let assignmentMarked = true;
          let assignmentPoints = 0;
          let assignmentMark = 0;
          let assignmentMarkOverride = 0;
          let assignmentOverridden = false;
          const assignmentDTO = {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            submissionId: this.uuidService.binToUUID(a.submissionId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            descriptionType: a.descriptionType,
            markingCriteria: null, // students should never see the marking criteria
            optional: a.optional,
            created: this.dateService.fixPrismaReadDate(a.created),
            modified: this.dateService.fixPrismaReadDate(a.modified),
            newParts: a.newParts.map(p => {
              let partComplete = true;
              let partMarked = true;
              let partPoints = 0;
              let partMark = 0;
              let partMarkOverride = 0;
              let partOverridden = false;
              const partDTO = {
                partId: this.uuidService.binToUUID(p.partId),
                assignmentId: this.uuidService.binToUUID(p.assignmentId),
                partNumber: p.partNumber,
                title: p.title,
                description: p.description,
                descriptionType: p.descriptionType,
                markingCriteria: null, // students should never see the marking criteria
                markingComments: null, // students should never see the marking comments
                created: this.dateService.fixPrismaReadDate(p.created),
                modified: this.dateService.fixPrismaReadDate(p.modified),
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
                    partMark += t.markOverride ?? t.mark ?? 0;
                    if (t.markOverride !== null) {
                      partOverridden = true;
                    }
                    partMarkOverride += t.markOverride ?? t.mark ?? 0;
                  }
                  return {
                    textBoxId: this.uuidService.binToUUID(t.textBoxId),
                    partId: this.uuidService.binToUUID(t.partId),
                    description: t.description,
                    lines: t.lines,
                    points: t.points,
                    mark: t.mark,
                    markOverride: t.markOverride,
                    notes: t.notes,
                    optional: t.optional,
                    order: t.order,
                    text: t.text,
                    complete: textBoxComplete,
                    created: this.dateService.fixPrismaReadDate(t.created),
                    modified: this.dateService.fixPrismaReadDate(t.modified),
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
                    partMark += u.markOverride ?? u.mark ?? 0;
                    if (u.markOverride !== null) {
                      partOverridden = true;
                    }
                    partMarkOverride += u.markOverride ?? u.mark ?? 0;
                  }
                  return {
                    uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                    partId: this.uuidService.binToUUID(u.partId),
                    label: u.label,
                    allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                    points: u.points,
                    mark: u.mark,
                    markOverride: u.markOverride,
                    notes: u.notes,
                    optional: u.optional,
                    order: u.order,
                    filename: u.filename,
                    filesize: u.filesize,
                    mimeTypeId: u.mimeTypeId,
                    complete: uploadSlotComplete,
                    created: this.dateService.fixPrismaReadDate(u.created),
                    modified: this.dateService.fixPrismaReadDate(u.modified),
                  };
                }),
                complete: partComplete,
                points: partPoints,
                mark: submission.closed ? partMark : null,
                markOverride: submission.closed ? partOverridden ? partMarkOverride : null : null,
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
              if (partOverridden) {
                assignmentOverridden = true;
              }
              assignmentMarkOverride += partMarkOverride;
              return partDTO;
            }),
            complete: assignmentComplete,
            points: assignmentPoints,
            mark: submission.closed && assignmentMarked ? assignmentMark : null,
            markOverride: submission.closed ? assignmentOverridden ? assignmentMarkOverride : null : null,
          };
          if (!a.optional && !assignmentComplete) {
            submissionComplete = false;
          }
          // ignore incomplete, optional assignments
          if (assignmentComplete || !a.optional) {
            submissionPoints += assignmentPoints;
            submissionMark += assignmentMark;
            if (assignmentOverridden) {
              submissionOverridden = true;
            }
            submissionMarkOverride += assignmentMarkOverride;
          }
          if (assignmentComplete && !assignmentMarked) {
            submissionMarked = false;
          }
          return assignmentDTO;
        }),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submission.closed && submissionMarked ? submissionMark : null,
        markOverride: submission.closed && submissionMarked && submissionOverridden ? submissionMarkOverride : null,
      });

    } catch (err) {
      this.logger.error('error getting submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
