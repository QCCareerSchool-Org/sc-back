import type { PrismaClient } from '@prisma/client';

import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { NewAssignmentDTO } from '../../domain/tutors/newAssignmentDTO.js';
import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { StudentDTO } from '../../domain/tutors/studentDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type GetNewSubmissionRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
};

export type GetNewSubmissionResponseDTO = NewSubmissionDTO & {
  enrollment: EnrollmentDTO & {
    course: CourseDTO;
    student: StudentDTO;
  };
  newAssignments: NewAssignmentDTO[];
};

export class GetNewSubmissionNotFound extends Error { }
export class GetNewSubmissionNotSubmitted extends Error { }
export class GetNewSubmissionSkipped extends Error { }
export class GetNewSubmissionWrongTutor extends Error { }

export class GetNewSubmissionInteractor implements IInteractor<GetNewSubmissionRequestDTO, GetNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId }: GetNewSubmissionRequestDTO): Promise<ResultType<GetNewSubmissionResponseDTO>> {
    try {
      const newSubmission = await this.prisma.newSubmission.findFirst({
        where: {
          submissionId: this.uuidService.uuidToBin(submissionId),
          enrollment: { studentId },
        },
        include: {
          enrollment: { include: { course: true, student: true, newSubmissions: true } },
          newAssignments: {
            include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } },
            orderBy: { assignmentNumber: 'asc' },
          },
        },
      });

      if (!newSubmission) {
        return Result.fail(new GetNewSubmissionNotFound());
      }

      if (!newSubmission.submitted) {
        return Result.fail(new GetNewSubmissionNotSubmitted());
      }

      if (newSubmission.skipped) {
        return Result.fail(new GetNewSubmissionSkipped());
      }

      const isThisSubmissionsTutor = newSubmission.tutorId === tutorId;
      const isThisEnrollmentsTutor = newSubmission.enrollment.tutorId === tutorId;
      const hasAnotherSubmissionToMark = newSubmission.enrollment.newSubmissions.some(s => s.submitted && !s.skipped && !s.closed && s.tutorId === tutorId);

      if (!isThisSubmissionsTutor && !isThisEnrollmentsTutor && !hasAnotherSubmissionToMark) {
        return Result.fail(new GetNewSubmissionWrongTutor());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

      return Result.success({
        submissionId: this.uuidService.binToUUID(newSubmission.submissionId),
        enrollmentId: newSubmission.enrollmentId,
        tutorId: newSubmission.tutorId,
        unitLetter: newSubmission.unitLetter,
        title: newSubmission.title,
        description: newSubmission.description,
        markingCriteria: newSubmission.markingCriteria,
        optional: newSubmission.optional,
        order: newSubmission.order,
        tutorComment: newSubmission.tutorComment,
        adminComment: newSubmission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(newSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(newSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(newSubmission.closed),
        skipped: newSubmission.skipped,
        responseFilename: newSubmission.responseFilename,
        responseFilesize: newSubmission.responseFilesize,
        responseMimeTypeId: newSubmission.responseMimeTypeId,
        created: this.dateService.fixPrismaReadDate(newSubmission.created),
        modified: this.dateService.fixPrismaReadDate(newSubmission.modified),
        enrollment: {
          enrollmentId: newSubmission.enrollment.enrollmentId,
          courseId: newSubmission.enrollment.courseId,
          studentId: newSubmission.enrollment.studentId,
          studentNumber: newSubmission.enrollment.studentNumber,
          tutorId: newSubmission.enrollment.tutorId,
          maxAssignments: newSubmission.enrollment.maxAssignments,
          graduated: newSubmission.enrollment.graduated,
          assignmentsDisabled: newSubmission.enrollment.assignmentsDisabled,
          quizzesDisabled: newSubmission.enrollment.quizzesDisabled,
          onHold: newSubmission.enrollment.onHold,
          holdReason: newSubmission.enrollment.holdReason,
          currencyCode: newSubmission.enrollment.currencyCode,
          courseCost: newSubmission.enrollment.courseCost.toNumber(),
          amountPaid: newSubmission.enrollment.amountPaid.toNumber(),
          monthlyInstallment: newSubmission.enrollment.monthlyInstallment === null ? null : newSubmission.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: this.dateService.fixPrismaReadDate(newSubmission.enrollment.enrollmentDate),
          fastTrack: newSubmission.enrollment.fastTrack,
          paymentsDisabled: newSubmission.enrollment.paymentsDisabled,
          course: {
            courseId: newSubmission.enrollment.course.courseId,
            schoolId: newSubmission.enrollment.course.schoolId,
            code: newSubmission.enrollment.course.code,
            version: newSubmission.enrollment.course.version,
            studentTypeId: newSubmission.enrollment.course.studentTypeId,
            name: newSubmission.enrollment.course.name,
            courseGuide: newSubmission.enrollment.course.courseGuide,
            quizzesEnabled: newSubmission.enrollment.course.quizzesEnabled,
            noTutor: newSubmission.enrollment.course.noTutor,
            submissionType: newSubmission.enrollment.course.submissionType,
            enabled: newSubmission.enrollment.course.enabled,
            order: newSubmission.enrollment.course.order,
            submissionsEnabled: newSubmission.enrollment.course.submissionsEnabled,
            entityVersion: newSubmission.enrollment.course.entityVersion,
          },
          student: {
            studentId: newSubmission.enrollment.student.studentId,
            countryId: newSubmission.enrollment.student.countryId,
            provinceId: newSubmission.enrollment.student.provinceId,
            studentTypeId: newSubmission.enrollment.student.studentTypeId,
            sex: newSubmission.enrollment.student.sex,
            firstName: newSubmission.enrollment.student.firstName,
            lastName: newSubmission.enrollment.student.lastName,
            entityVersion: newSubmission.enrollment.student.entityVersion,
            modified: this.dateService.fixPrismaReadDate(newSubmission.enrollment.student.modified),
          },
        },
        newAssignments: newSubmission.newAssignments.map(a => {
          let assignmentComplete = true;
          let assignmentMarked = true;
          let assignmentPoints = 0;
          let assignmentMark = 0;
          for (const p of a.newParts) {
            let partComplete = true;
            let partMarked = true;
            let partPoints = 0;
            let partMark = 0;
            for (const t of p.newTextBoxes) {
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
            }
            for (const u of p.newUploadSlots) {
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
            }
            if (!partComplete) {
              assignmentComplete = false;
            }
            if (partComplete && !partMarked) {
              assignmentMarked = false;
            }
            // parts can't be optional, so we always add these
            assignmentPoints += partPoints;
            assignmentMark += partMark;
          }
          if (!assignmentComplete && !a.optional) {
            submissionComplete = false;
          }
          if (assignmentComplete && !assignmentMarked) {
            submissionMarked = false;
          }
          // ignore incomplete, optional assignments
          if (assignmentComplete || !a.optional) {
            submissionPoints += assignmentPoints;
            submissionMark += assignmentMark;
          }
          return {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            submissionId: this.uuidService.binToUUID(a.submissionId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            descriptionType: a.descriptionType,
            markingCriteria: a.markingCriteria,
            optional: a.optional,
            complete: assignmentComplete,
            points: assignmentPoints,
            mark: assignmentMarked ? assignmentMark : null,
            created: this.dateService.fixPrismaReadDate(a.created),
            modified: this.dateService.fixPrismaReadDate(a.modified),
          };
        }),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submissionMarked ? submissionMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
