import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { StudentDTO } from '../../domain/administrators/studentDTO';
import type { CourseDTO } from '../../domain/courseDTO';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { NewUnitReturnDTO } from '../../domain/newUnitReturnDTO';
import type { TutorDTO } from '../../domain/tutorDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type GetNewUnitReturnRequestDTO = {
  unitReturnId: string;
};

export type GetNewUnitReturnResponseDTO = NewUnitReturnDTO & {
  newUnit: NewUnitDTO & {
    tutor: TutorDTO;
    enrollment: EnrollmentDTO & {
      course: CourseDTO;
      student: StudentDTO;
    };
  };
};

export class GetNewUnitReturnNotFound extends Error { }
export class GetNewUnitReturnTutorNotFound extends Error { }

export class GetNewUnitReturnInteractor implements IInteractor<GetNewUnitReturnRequestDTO, GetNewUnitReturnResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ unitReturnId }: GetNewUnitReturnRequestDTO): Promise<ResultType<GetNewUnitReturnResponseDTO>> {
    try {
      const unitReturnIdBin = this.uuidService.uuidToBin(unitReturnId);

      // find the unit return
      const unitReturn = await this.prisma.newUnitReturn.findFirst({
        where: { unitReturnId: unitReturnIdBin },
        include: {
          newUnit: {
            include: {
              tutor: true,
              enrollment: { include: { course: true, student: true } },
              newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } },
            },
          },
        },
      });
      if (!unitReturn) {
        return Result.fail(new GetNewUnitReturnNotFound());
      }

      if (!unitReturn.newUnit.tutor) {
        return Result.fail(new GetNewUnitReturnTutorNotFound());
      }

      let unitComplete = true;
      let unitMarked = true;
      let unitPoints = 0;
      let unitMark = 0;
      for (const newAssignment of unitReturn.newUnit.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const newPart of newAssignment.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
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
        if (!assignmentComplete && !newAssignment.optional) {
          unitComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          unitMarked = false;
        }
        if (assignmentComplete || !newAssignment.optional) {
          unitPoints += assignmentPoints;
          unitMark += assignmentMark;
        }
      }

      return Result.success({
        unitReturnId: this.uuidService.binToUUID(unitReturn.unitReturnId),
        unitId: this.uuidService.binToUUID(unitReturn.unitId),
        returned: unitReturn.returned,
        completed: unitReturn.completed,
        newUnit: {
          unitId: this.uuidService.binToUUID(unitReturn.newUnit.unitId),
          enrollmentId: unitReturn.newUnit.enrollmentId,
          tutorId: unitReturn.newUnit.tutorId,
          unitLetter: unitReturn.newUnit.unitLetter,
          title: unitReturn.newUnit.title,
          description: unitReturn.newUnit.description,
          markingCriteria: unitReturn.newUnit.markingCriteria,
          optional: unitReturn.newUnit.optional,
          order: unitReturn.newUnit.order,
          tutorComment: unitReturn.newUnit.tutorComment,
          adminComment: unitReturn.newUnit.adminComment,
          submitted: unitReturn.newUnit.submitted,
          transferred: unitReturn.newUnit.transferred,
          closed: unitReturn.newUnit.closed,
          skipped: unitReturn.newUnit.skipped,
          responseFilename: unitReturn.newUnit.responseFilename,
          responseFilesize: unitReturn.newUnit.responseFilesize,
          responseMimeTypeId: unitReturn.newUnit.responseMimeTypeId,
          complete: unitComplete,
          points: unitPoints,
          mark: unitMark,
          created: unitReturn.newUnit.created,
          modified: unitReturn.newUnit.modified,
          tutor: {
            tutorId: unitReturn.newUnit.tutor.tutorId,
            firstName: unitReturn.newUnit.tutor.firstName,
            lastName: unitReturn.newUnit.tutor.lastName,
            introduction: await this.isTutorIntroductionPresent(unitReturn.newUnit.tutorId, unitReturn.newUnit.enrollment.course.code),
          },
          enrollment: {
            enrollmentId: unitReturn.newUnit.enrollment.enrollmentId,
            courseId: unitReturn.newUnit.enrollment.courseId,
            studentId: unitReturn.newUnit.enrollment.studentId,
            studentNumber: unitReturn.newUnit.enrollment.studentNumber,
            tutorId: unitReturn.newUnit.enrollment.tutorId,
            maxAssignments: unitReturn.newUnit.enrollment.maxAssignments,
            graduated: unitReturn.newUnit.enrollment.graduated,
            assignmentsDisabled: unitReturn.newUnit.enrollment.assignmentsDisabled,
            quizzesDisabled: unitReturn.newUnit.enrollment.quizzesDisabled,
            onHold: unitReturn.newUnit.enrollment.onHold,
            holdReason: unitReturn.newUnit.enrollment.holdReason,
            currencyCode: unitReturn.newUnit.enrollment.currencyCode,
            courseCost: unitReturn.newUnit.enrollment.courseCost.toNumber(),
            amountPaid: unitReturn.newUnit.enrollment.amountPaid.toNumber(),
            monthlyInstallment: unitReturn.newUnit.enrollment.monthlyInstallment === null ? null : unitReturn.newUnit.enrollment.monthlyInstallment.toNumber(),
            enrollmentDate: unitReturn.newUnit.enrollment.enrollmentDate,
            fastTrack: unitReturn.newUnit.enrollment.fastTrack,
            paymentsDisabled: unitReturn.newUnit.enrollment.paymentsDisabled,
            course: {
              courseId: unitReturn.newUnit.enrollment.course.courseId,
              schoolId: unitReturn.newUnit.enrollment.course.schoolId,
              code: unitReturn.newUnit.enrollment.course.code,
              version: unitReturn.newUnit.enrollment.course.version,
              studentTypeId: unitReturn.newUnit.enrollment.course.studentTypeId,
              name: unitReturn.newUnit.enrollment.course.name,
              courseGuide: unitReturn.newUnit.enrollment.course.courseGuide,
              quizzesEnabled: unitReturn.newUnit.enrollment.course.quizzesEnabled,
              noTutor: unitReturn.newUnit.enrollment.course.noTutor,
              unitType: unitReturn.newUnit.enrollment.course.unitType,
              order: unitReturn.newUnit.enrollment.course.order,
              enabled: unitReturn.newUnit.enrollment.course.enabled,
              newUnitsEnabled: unitReturn.newUnit.enrollment.course.newUnitsEnabled,
              entityVersion: unitReturn.newUnit.enrollment.course.entityVersion,
            },
            student: {
              studentId: unitReturn.newUnit.enrollment.student.studentId,
              countryId: unitReturn.newUnit.enrollment.student.countryId,
              provinceId: unitReturn.newUnit.enrollment.student.provinceId,
              studentTypeId: unitReturn.newUnit.enrollment.student.studentTypeId,
              passwordChanged: unitReturn.newUnit.enrollment.student.passwordChanged,
              sex: unitReturn.newUnit.enrollment.student.sex,
              firstName: unitReturn.newUnit.enrollment.student.firstName,
              lastName: unitReturn.newUnit.enrollment.student.lastName,
              numLogins: unitReturn.newUnit.enrollment.student.numLogins,
              lastLogin: unitReturn.newUnit.enrollment.student.lastLogin,
              expiry: unitReturn.newUnit.enrollment.student.expiry,
              emailAddress: unitReturn.newUnit.enrollment.student.emailAddress,
              creationDate: unitReturn.newUnit.enrollment.student.creationDate,
              arrears: unitReturn.newUnit.enrollment.student.arrears,
              forumUsername: unitReturn.newUnit.enrollment.student.forumUsername,
              apiUsername: unitReturn.newUnit.enrollment.student.apiUsername,
              questionnaire: unitReturn.newUnit.enrollment.student.questionnaire,
              videoViewed: unitReturn.newUnit.enrollment.student.videoViewed,
              ajaxUploads: unitReturn.newUnit.enrollment.student.ajaxUploads,
              upgradeNotification: unitReturn.newUnit.enrollment.student.upgradeNotification,
              entityVersion: unitReturn.newUnit.enrollment.student.entityVersion,
              timestamp: unitReturn.newUnit.enrollment.student.timestamp,
            },
          },
        },
      });

    } catch (err) {
      this.logger.error('error getting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
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
