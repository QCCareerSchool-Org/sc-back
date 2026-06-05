import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { NewAssignmentDTO } from '../../domain/students/newAssignmentDTO.js';
import type { NewPartDTO } from '../../domain/students/newPartDTO.js';
import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { NewTextBoxDTO } from '../../domain/students/newTextBoxDTO.js';
import type { NewUploadSlotDTO } from '../../domain/students/newUploadSlotDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetNewSubmissionRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
};

export type GetNewSubmissionResponseDTO = NewSubmissionDTO & {
  enrollment: EnrollmentDTO & {
    course: CourseDTO & {
      school: SchoolDTO;
    };
  };
  newAssignments: Array<NewAssignmentDTO & {
    newParts: Array<NewPartDTO & {
      newTextBoxes: NewTextBoxDTO[];
      newUploadSlots: NewUploadSlotDTO[];
    }>;
  }>;
  parent: NewSubmissionDTO | null;
  // badges: BadgeDTO[];
};

abstract class GetNewSubmissionError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class GetNewSubmissionNotFound extends GetNewSubmissionError { }

/**
 * Should consider mark overrides.
 */
export class GetNewSubmissionInteractor extends StudentInteractor<GetNewSubmissionRequestDTO, GetNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId }: GetNewSubmissionRequestDTO): Promise<ResultType<GetNewSubmissionResponseDTO>> {
    try {
      const submission = await this.prisma.newSubmission.findFirst({
        where: {
          enrollment: { studentId, courseId },
          submissionId: this.uuidService.uuidToBin(submissionId),
        },
        include: {
          enrollment: { include: { course: { include: { school: true } } } },
          newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
          parent: { include: { parent: true } },
          // badges: { include: { badge: true } },
        },
      });

      if (!submission) {
        return failure(new GetNewSubmissionNotFound());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

      return success({
        submissionId: this.uuidService.binToUUID(submission.submissionId),
        enrollmentId: submission.enrollmentId,
        tutorId: submission.tutorId,
        unitLetter: submission.unitLetter,
        title: submission.title,
        description: submission.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: submission.optional,
        order: submission.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: submission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(submission.submitted),
        transferred: this.dateService.fixPrismaReadDate(submission.transferred),
        closed: this.dateService.fixPrismaReadDate(submission.closed),
        skipped: submission.skipped,
        responseFilename: submission.responseFilename === null ? null : `${submission.enrollment.course.code}${submission.enrollment.enrollmentId} Submission ${submission.unitLetter}.mp3`,
        responseFilesize: submission.responseFilesize,
        responseMimeTypeId: submission.responseMimeTypeId,
        responseProgress: submission.responseProgress,
        redoId: submission.redoId === null ? null : this.uuidService.binToUUID(submission.redoId),
        hasParent: submission.parent !== null,
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
          graduatedDate: this.dateService.fixPrismaReadDate(submission.enrollment.graduatedDate),
          assignmentsDisabled: submission.enrollment.assignmentsDisabled,
          quizzesDisabled: submission.enrollment.quizzesDisabled,
          onHold: submission.enrollment.onHold,
          holdReason: submission.enrollment.holdReason,
          currencyCode: submission.enrollment.currencyCode,
          courseCost: submission.enrollment.courseCost.toNumber(),
          amountPaid: submission.enrollment.amountPaid.toNumber(),
          monthlyInstallment: submission.enrollment.monthlyInstallment === null ? null : submission.enrollment.monthlyInstallment.toNumber(),
          enrollmentDate: this.dateService.fixPrismaReadDate(submission.enrollment.enrollmentDate),
          dueDate: this.dateService.fixPrismaReadDate(submission.enrollment.dueDate),
          fastTrack: submission.enrollment.fastTrack,
          paymentsDisabled: submission.enrollment.paymentsDisabled,
          course: {
            courseId: submission.enrollment.course.courseId,
            schoolId: submission.enrollment.course.schoolId,
            variantId: submission.enrollment.course.variantId,
            code: submission.enrollment.course.code,
            version: submission.enrollment.course.version,
            studentTypeId: submission.enrollment.course.studentTypeId,
            name: submission.enrollment.course.name,
            subheading: submission.enrollment.course.subheading,
            courseGuide: submission.enrollment.course.courseGuide,
            quizzesEnabled: submission.enrollment.course.quizzesEnabled,
            noTutor: submission.enrollment.course.noTutor,
            submissionType: submission.enrollment.course.submissionType,
            order: submission.enrollment.course.order,
            enabled: submission.enrollment.course.enabled,
            submissionsEnabled: submission.enrollment.course.submissionsEnabled,
            designationId: submission.enrollment.course.designationId,
            entityVersion: submission.enrollment.course.entityVersion,
            school: {
              schoolId: submission.enrollment.course.school.schoolId,
              name: submission.enrollment.course.school.name,
              slug: submission.enrollment.course.school.slug,
              order: submission.enrollment.course.school.order,
              entityVersion: submission.enrollment.course.school.entityVersion,
            },
          },
        },
        newAssignments: submission.newAssignments.map(a => {
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
            markingCriteria: null,
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
                markingCriteria: null,
                markingComments: null,
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
                  }
                  return {
                    textBoxId: this.uuidService.binToUUID(t.textBoxId),
                    partId: this.uuidService.binToUUID(t.partId),
                    description: t.description,
                    lines: t.lines,
                    points: t.points,
                    mark: submission.closed ? t.markOverride ?? t.mark : null,
                    notes: null, // students should never see the tutor's notes
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
                  }
                  return {
                    uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                    partId: this.uuidService.binToUUID(u.partId),
                    label: u.label,
                    allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                    points: u.points,
                    mark: submission.closed ? u.markOverride ?? u.mark : null,
                    notes: null, // students should never see the tutor's notes
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
                mark: submission.closed && partMarked ? partMark : null,
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
            mark: submission.closed && assignmentMarked ? assignmentMark : null,
          };
          if (!a.optional && !assignmentComplete) {
            submissionComplete = false;
          }
          // ignore incomplete, optional assignments
          if (assignmentComplete || !a.optional) {
            submissionPoints += assignmentPoints;
            submissionMark += assignmentMark;
          }
          if (assignmentComplete && !assignmentMarked) {
            submissionMarked = false;
          }
          return assignment;
        }),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submission.closed && submissionMarked ? submissionMark : null,
        parent: submission.parent === null ? null : {
          submissionId: this.uuidService.binToUUID(submission.parent.submissionId),
          enrollmentId: submission.parent.enrollmentId,
          tutorId: submission.parent.tutorId,
          unitLetter: submission.parent.unitLetter,
          title: submission.parent.title,
          description: submission.parent.description,
          markingCriteria: null, // students should never see the marking criteria
          optional: submission.parent.optional,
          order: submission.parent.order,
          tutorComment: null, // students should never see the tutor comment
          adminComment: submission.parent.adminComment,
          submitted: this.dateService.fixPrismaReadDate(submission.parent.submitted),
          transferred: this.dateService.fixPrismaReadDate(submission.parent.transferred),
          closed: this.dateService.fixPrismaReadDate(submission.parent.closed),
          skipped: submission.parent.skipped,
          responseFilename: submission.parent.responseFilename === null ? null : `${submission.enrollment.course.code}${submission.enrollment.enrollmentId} Submission ${submission.parent.unitLetter}.mp3`,
          responseFilesize: submission.parent.responseFilesize,
          responseMimeTypeId: submission.parent.responseMimeTypeId,
          responseProgress: submission.parent.responseProgress,
          redoId: submission.parent.redoId === null ? null : this.uuidService.binToUUID(submission.parent.redoId),
          hasParent: submission.parent.parent !== null,
          complete: true,
          points: -1,
          mark: null,
          created: this.dateService.fixPrismaReadDate(submission.parent.created),
          modified: this.dateService.fixPrismaReadDate(submission.parent.modified),
        },
        // badges: submission.badges.map(b => ({
        //   badgeId: this.uuidService.binToUUID(b.badge.badgeId),
        //   name: b.badge.name,
        //   description: b.badge.description,
        //   created: this.dateService.fixPrismaReadDate(b.created),
        // })),
      });

    } catch (err) {
      this.logger.error('error getting new submission', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
