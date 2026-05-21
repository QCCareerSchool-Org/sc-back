import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
// import type { BadgeDTO } from '../../domain/badgeDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewAssignmentDTO } from '../../domain/tutors/newAssignmentDTO.js';
import type { NewPartDTO } from '../../domain/tutors/newPartDTO.js';
import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { NewTextBoxDTO } from '../../domain/tutors/newTextBoxDTO.js';
import type { NewUploadSlotDTO } from '../../domain/tutors/newUploadSlotDTO.js';
import type { StudentDTO } from '../../domain/tutors/studentDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

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
  newAssignments: Array<NewAssignmentDTO & {
    newParts: Array<NewPartDTO & {
      newTextBoxes: NewTextBoxDTO[];
      newUploadSlots: NewUploadSlotDTO[];
    }>;
  }>;
  // badges: BadgeDTO[];
};

abstract class GetNewSubmissionError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class GetNewSubmissionNotFound extends GetNewSubmissionError { }
export class GetNewSubmissionNotSubmitted extends GetNewSubmissionError { }
export class GetNewSubmissionSkipped extends GetNewSubmissionError { }
export class GetNewSubmissionWrongTutor extends GetNewSubmissionError { }

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
          enrollment: { include: { course: true, student: { include: { tutorNote: true } }, newSubmissions: true } },
          newAssignments: {
            include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } },
            orderBy: { assignmentNumber: 'asc' },
          },
          parent: true,
          // badges: { include: { badge: true } },
        },
      });

      console.log(newSubmission?.enrollment.student);

      if (!newSubmission) {
        return failure(new GetNewSubmissionNotFound());
      }

      if (!newSubmission.submitted) {
        return failure(new GetNewSubmissionNotSubmitted());
      }

      if (newSubmission.skipped) {
        return failure(new GetNewSubmissionSkipped());
      }

      const isThisSubmissionsTutor = newSubmission.tutorId === tutorId;
      const isThisEnrollmentsTutor = newSubmission.enrollment.tutorId === tutorId;
      const hasAnotherSubmissionToMark = newSubmission.enrollment.newSubmissions.some(s => s.submitted && !s.skipped && !s.closed && s.tutorId === tutorId);

      if (!isThisSubmissionsTutor && !isThisEnrollmentsTutor && !hasAnotherSubmissionToMark) {
        return failure(new GetNewSubmissionWrongTutor());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

      return success({
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
        responseProgress: newSubmission.responseProgress,
        redoId: newSubmission.redoId === null ? null : this.uuidService.binToUUID(newSubmission.redoId),
        hasParent: newSubmission.parent !== null,
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
          dueDate: this.dateService.fixPrismaReadDate(newSubmission.enrollment.dueDate),
          fastTrack: newSubmission.enrollment.fastTrack,
          paymentsDisabled: newSubmission.enrollment.paymentsDisabled,
          course: {
            courseId: newSubmission.enrollment.course.courseId,
            schoolId: newSubmission.enrollment.course.schoolId,
            variantId: newSubmission.enrollment.course.variantId,
            code: newSubmission.enrollment.course.code,
            version: newSubmission.enrollment.course.version,
            studentTypeId: newSubmission.enrollment.course.studentTypeId,
            name: newSubmission.enrollment.course.name,
            subheading: newSubmission.enrollment.course.subheading,
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
            tutorNote: newSubmission.enrollment.student.tutorNote?.note ?? null,
            entityVersion: newSubmission.enrollment.student.entityVersion,
            modified: this.dateService.fixPrismaReadDate(newSubmission.enrollment.student.modified),
          },
        },
        newAssignments: newSubmission.newAssignments.map(a => {
          let assignmentComplete = true;
          let assignmentMarked = true;
          let assignmentPoints = 0;
          let assignmentMark = 0;
          const assignment = {
            assignmentId: this.uuidService.binToUUID(a.assignmentId),
            submissionId: this.uuidService.binToUUID(a.submissionId),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            descriptionType: a.descriptionType,
            markingCriteria: a.markingCriteria,
            optional: a.optional,
            created: this.dateService.fixPrismaReadDate(a.created),
            modified: this.dateService.fixPrismaReadDate(a.modified),
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
          };
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
          return assignment;
        }),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submissionMarked ? submissionMark : null,
        // badges: newSubmission.badges.map(b => ({
        //   badgeId: this.uuidService.binToUUID(b.badge.badgeId),
        //   name: b.badge.name,
        //   description: b.badge.name,
        //   created: b.created,
        // })),
      });

    } catch (err) {
      this.logger.error('error getting new submission', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
