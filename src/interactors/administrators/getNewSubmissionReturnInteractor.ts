import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewSubmissionDTO } from '../../domain/administrators/newSubmissionDTO.js';
import type { StudentDTO } from '../../domain/administrators/studentDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { NewSubmissionReturnDTO } from '../../domain/newSubmissionReturnDTO.js';
import type { TutorDTO } from '../../domain/tutorDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type GetNewSubmissionReturnRequestDTO = {
  submissionReturnId: string;
};

export type GetNewSubmissionReturnResponseDTO = NewSubmissionReturnDTO & {
  newSubmission: NewSubmissionDTO & {
    tutor: TutorDTO;
    enrollment: EnrollmentDTO & {
      course: CourseDTO;
      student: StudentDTO;
    };
  };
};

export class GetNewSubmissionReturnNotFound extends Error { }
export class GetNewSubmissionReturnTutorNotFound extends Error { }

export class GetNewSubmissionReturnInteractor implements IInteractor<GetNewSubmissionReturnRequestDTO, GetNewSubmissionReturnResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ submissionReturnId }: GetNewSubmissionReturnRequestDTO): Promise<ResultType<GetNewSubmissionReturnResponseDTO>> {
    try {
      const submissionReturnIdBin = this.uuidService.uuidToBin(submissionReturnId);

      // find the submission return
      const submissionReturn = await this.prisma.newSubmissionReturn.findFirst({
        where: { submissionReturnId: submissionReturnIdBin },
        include: {
          newSubmission: {
            include: {
              tutor: true,
              enrollment: { include: { course: true, student: true } },
              newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
              parent: true,
            },
          },
        },
      });
      if (!submissionReturn) {
        return failure(new GetNewSubmissionReturnNotFound());
      }

      if (!submissionReturn.newSubmission.tutor) {
        return failure(new GetNewSubmissionReturnTutorNotFound());
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;
      let submissionMarkOverride: number | null = null;
      for (const newAssignment of submissionReturn.newSubmission.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        let assignmentMarkOverride: number | null = null;
        for (const newPart of newAssignment.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          let partMarkOverride: number | null = null;
          for (const newTextBox of newPart.newTextBoxes) {
            const textBoxComplete = newTextBox.text.length > 0;
            if (!textBoxComplete && !newTextBox.optional) {
              partComplete = false;
            }
            if (textBoxComplete && newTextBox.mark === null && newTextBox.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !newTextBox.optional) {
              partPoints += newTextBox.points;
              partMark += newTextBox.mark ?? 0;
              if (newTextBox.markOverride !== null) {
                partMarkOverride = (partMarkOverride ?? 0) + newTextBox.markOverride;
              }
            }
          }
          for (const newUploadSlot of newPart.newUploadSlots) {
            const uploadSlotComplete = newUploadSlot.filename !== null;
            if (!uploadSlotComplete && !newUploadSlot.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && newUploadSlot.mark === null && newUploadSlot.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !newUploadSlot.optional) {
              partPoints += newUploadSlot.points;
              partMark += newUploadSlot.mark ?? 0;
              if (newUploadSlot.markOverride !== null) {
                partMarkOverride = (partMarkOverride ?? 0) + newUploadSlot.markOverride;
              }
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
          if (partMarkOverride !== null) {
            assignmentMarkOverride = (assignmentMarkOverride ?? 0) + partMarkOverride;
          }
        }
        if (!assignmentComplete && !newAssignment.optional) {
          submissionComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          submissionMarked = false;
        }
        if (assignmentComplete || !newAssignment.optional) {
          submissionPoints += assignmentPoints;
          submissionMark += assignmentMark;
          if (assignmentMarkOverride !== null) {
            submissionMarkOverride = (submissionMarkOverride ?? 0) + assignmentMarkOverride;
          }
        }
      }

      return success({
        submissionReturnId: this.uuidService.binToUUID(submissionReturn.submissionReturnId),
        submissionId: this.uuidService.binToUUID(submissionReturn.submissionId),
        returned: this.dateService.fixPrismaReadDate(submissionReturn.returned),
        completed: this.dateService.fixPrismaReadDate(submissionReturn.completed),
        newSubmission: {
          submissionId: this.uuidService.binToUUID(submissionReturn.newSubmission.submissionId),
          enrollmentId: submissionReturn.newSubmission.enrollmentId,
          tutorId: submissionReturn.newSubmission.tutorId,
          unitLetter: submissionReturn.newSubmission.unitLetter,
          title: submissionReturn.newSubmission.title,
          description: submissionReturn.newSubmission.description,
          markingCriteria: submissionReturn.newSubmission.markingCriteria,
          optional: submissionReturn.newSubmission.optional,
          order: submissionReturn.newSubmission.order,
          tutorComment: submissionReturn.newSubmission.tutorComment,
          adminComment: submissionReturn.newSubmission.adminComment,
          submitted: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.submitted),
          transferred: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.transferred),
          closed: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.closed),
          skipped: submissionReturn.newSubmission.skipped,
          responseFilename: submissionReturn.newSubmission.responseFilename,
          responseFilesize: submissionReturn.newSubmission.responseFilesize,
          responseMimeTypeId: submissionReturn.newSubmission.responseMimeTypeId,
          responseProgress: submissionReturn.newSubmission.responseProgress,
          redoId: submissionReturn.newSubmission.redoId === null ? null : this.uuidService.binToUUID(submissionReturn.newSubmission.redoId),
          hasParent: submissionReturn.newSubmission.parent !== null,
          complete: submissionComplete,
          points: submissionPoints,
          mark: submissionReturn.newSubmission.closed && submissionMarked ? submissionMark : null,
          markOverride: submissionReturn.newSubmission.closed && submissionMarked ? submissionMarkOverride : null,
          created: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.created),
          modified: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.modified),
          tutor: {
            tutorId: submissionReturn.newSubmission.tutor.tutorId,
            firstName: submissionReturn.newSubmission.tutor.firstName,
            lastName: submissionReturn.newSubmission.tutor.lastName,
            introduction: await this.isTutorIntroductionPresent(submissionReturn.newSubmission.tutorId, submissionReturn.newSubmission.enrollment.course.code),
          },
          enrollment: {
            enrollmentId: submissionReturn.newSubmission.enrollment.enrollmentId,
            courseId: submissionReturn.newSubmission.enrollment.courseId,
            studentId: submissionReturn.newSubmission.enrollment.studentId,
            studentNumber: submissionReturn.newSubmission.enrollment.studentNumber,
            tutorId: submissionReturn.newSubmission.enrollment.tutorId,
            maxAssignments: submissionReturn.newSubmission.enrollment.maxAssignments,
            graduated: submissionReturn.newSubmission.enrollment.graduated,
            assignmentsDisabled: submissionReturn.newSubmission.enrollment.assignmentsDisabled,
            quizzesDisabled: submissionReturn.newSubmission.enrollment.quizzesDisabled,
            onHold: submissionReturn.newSubmission.enrollment.onHold,
            holdReason: submissionReturn.newSubmission.enrollment.holdReason,
            currencyCode: submissionReturn.newSubmission.enrollment.currencyCode,
            courseCost: submissionReturn.newSubmission.enrollment.courseCost.toNumber(),
            amountPaid: submissionReturn.newSubmission.enrollment.amountPaid.toNumber(),
            monthlyInstallment: submissionReturn.newSubmission.enrollment.monthlyInstallment === null ? null : submissionReturn.newSubmission.enrollment.monthlyInstallment.toNumber(),
            enrollmentDate: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.enrollmentDate),
            dueDate: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.dueDate),
            fastTrack: submissionReturn.newSubmission.enrollment.fastTrack,
            paymentsDisabled: submissionReturn.newSubmission.enrollment.paymentsDisabled,
            course: {
              courseId: submissionReturn.newSubmission.enrollment.course.courseId,
              schoolId: submissionReturn.newSubmission.enrollment.course.schoolId,
              variantId: submissionReturn.newSubmission.enrollment.course.variantId,
              code: submissionReturn.newSubmission.enrollment.course.code,
              version: submissionReturn.newSubmission.enrollment.course.version,
              studentTypeId: submissionReturn.newSubmission.enrollment.course.studentTypeId,
              name: submissionReturn.newSubmission.enrollment.course.name,
              courseGuide: submissionReturn.newSubmission.enrollment.course.courseGuide,
              quizzesEnabled: submissionReturn.newSubmission.enrollment.course.quizzesEnabled,
              noTutor: submissionReturn.newSubmission.enrollment.course.noTutor,
              submissionType: submissionReturn.newSubmission.enrollment.course.submissionType,
              order: submissionReturn.newSubmission.enrollment.course.order,
              enabled: submissionReturn.newSubmission.enrollment.course.enabled,
              submissionsEnabled: submissionReturn.newSubmission.enrollment.course.submissionsEnabled,
              entityVersion: submissionReturn.newSubmission.enrollment.course.entityVersion,
            },
            student: {
              studentId: submissionReturn.newSubmission.enrollment.student.studentId,
              countryId: submissionReturn.newSubmission.enrollment.student.countryId,
              provinceId: submissionReturn.newSubmission.enrollment.student.provinceId,
              studentTypeId: submissionReturn.newSubmission.enrollment.student.studentTypeId,
              passwordChanged: submissionReturn.newSubmission.enrollment.student.passwordChanged,
              sex: submissionReturn.newSubmission.enrollment.student.sex,
              firstName: submissionReturn.newSubmission.enrollment.student.firstName,
              lastName: submissionReturn.newSubmission.enrollment.student.lastName,
              numLogins: submissionReturn.newSubmission.enrollment.student.numLogins,
              lastLogin: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.student.lastLogin),
              expiry: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.student.expiry),
              emailAddress: submissionReturn.newSubmission.enrollment.student.emailAddress,
              arrears: submissionReturn.newSubmission.enrollment.student.arrears,
              forumUsername: submissionReturn.newSubmission.enrollment.student.forumUsername,
              apiUsername: submissionReturn.newSubmission.enrollment.student.apiUsername,
              questionnaire: submissionReturn.newSubmission.enrollment.student.questionnaire,
              videoViewed: submissionReturn.newSubmission.enrollment.student.videoViewed,
              ajaxUploads: submissionReturn.newSubmission.enrollment.student.ajaxUploads,
              upgradeNotification: submissionReturn.newSubmission.enrollment.student.upgradeNotification,
              entityVersion: submissionReturn.newSubmission.enrollment.student.entityVersion,
              created: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.student.created),
              modified: this.dateService.fixPrismaReadDate(submissionReturn.newSubmission.enrollment.student.modified),
            },
          },
        },
      });

    } catch (err) {
      this.logger.error('error getting submission template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async isTutorIntroductionPresent(tutorId: number | null, courseCode: string): Promise<boolean> {
    if (tutorId === null) {
      return false;
    }
    const tutorAudioFileLocation = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}`;
    const fileStats = await this.fileService.stat(tutorAudioFileLocation);
    if (fileStats) {
      return true;
    }
    return false;
  }
}
