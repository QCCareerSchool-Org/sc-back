import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { OldUnitDTO } from '../../domain/oldUnitDTO';
import type { OldUnitTemplateDTO } from '../../domain/oldUnitTemplateDTO';
import type { StudentDTO } from '../../domain/students/studentDTO';
import type { TutorDTO } from '../../domain/tutorDTO';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import type { ResultType } from '../result';
import { Result } from '../result';

export type GetEnrollmentRequestDTO = {
  studentId: number;
  courseId: number;
};

export type GetEnrollmentResponseDTO = EnrollmentDTO & {
  student: StudentDTO;
  course: CourseDTO & {
    oldUnitTemplates: OldUnitTemplateDTO[];
    newUnitTemplates: NewUnitTemplateDTO[];
  };
  tutor: TutorDTO | null;
  oldUnits: OldUnitDTO[];
  newUnits: NewUnitDTO[];
};

export class GetEnrollmentNotFound extends Error { }

export class GetEnrollmentInteractor implements IInteractor<GetEnrollmentRequestDTO, GetEnrollmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId }: GetEnrollmentRequestDTO): Promise<ResultType<GetEnrollmentResponseDTO>> {
    try {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: {
          student: true,
          course: { include: { newUnitTemplates: true, oldUnitTemplates: true } },
          tutor: true,
          oldUnits: true,
          newUnits: { include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } } },
        },
      });

      if (!enrollment) {
        return Result.fail(new GetEnrollmentNotFound());
      }

      return Result.success({
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        studentNumber: enrollment.studentNumber,
        tutorId: enrollment.tutorId,
        maxAssignments: enrollment.maxAssignments,
        graduated: enrollment.graduated,
        assignmentsDisabled: enrollment.assignmentsDisabled,
        quizzesDisabled: enrollment.quizzesDisabled,
        onHold: enrollment.onHold,
        holdReason: enrollment.holdReason,
        currencyCode: enrollment.currencyCode,
        courseCost: enrollment.courseCost.toNumber(),
        amountPaid: enrollment.amountPaid.toNumber(),
        monthlyInstallment: enrollment.monthlyInstallment?.toNumber() ?? null,
        enrollmentDate: enrollment.enrollmentDate,
        fastTrack: enrollment.fastTrack,
        paymentsDisabled: enrollment.paymentsDisabled,
        student: {
          studentId: enrollment.student.studentId,
          countryId: enrollment.student.countryId,
          provinceId: enrollment.student.provinceId,
          studentTypeId: enrollment.student.studentTypeId,
          passwordChanged: enrollment.student.passwordChanged,
          sex: enrollment.student.sex,
          firstName: enrollment.student.firstName,
          lastName: enrollment.student.lastName,
          numLogins: enrollment.student.numLogins,
          lastLogin: enrollment.student.lastLogin,
          expiry: enrollment.student.expiry,
          emailAddress: enrollment.student.emailAddress,
          creationDate: enrollment.student.creationDate,
          arrears: enrollment.student.arrears,
          forumUsername: enrollment.student.forumUsername,
          forumPasswordNew: enrollment.student.forumPasswordNew,
          apiUsername: enrollment.student.apiUsername,
          apiPasswordNew: enrollment.student.apiPasswordNew,
          questionnaire: enrollment.student.questionnaire,
          videoViewed: enrollment.student.videoViewed,
          ajaxUploads: enrollment.student.ajaxUploads,
          upgradeNotification: enrollment.student.upgradeNotification,
          entityVersion: enrollment.student.entityVersion,
          timestamp: enrollment.student.timestamp,
        },
        course: {
          courseId: enrollment.course.courseId,
          schoolId: enrollment.course.schoolId,
          code: enrollment.course.code,
          version: enrollment.course.version,
          studentTypeId: enrollment.course.studentTypeId,
          name: enrollment.course.name,
          courseGuide: enrollment.course.courseGuide,
          quizzesEnabled: enrollment.course.quizzesEnabled,
          noTutor: enrollment.course.noTutor,
          unitType: enrollment.course.unitType,
          enabled: enrollment.course.enabled,
          order: enrollment.course.order,
          newUnitsEnabled: enrollment.course.newUnitsEnabled,
          entityVersion: enrollment.course.entityVersion,
          oldUnitTemplates: enrollment.course.oldUnitTemplates.map(unit => ({
            unitId: unit.unitId,
            courseId: unit.courseId,
            unitLetter: unit.unitLetter,
            title: unit.title,
            responseType: unit.responseType,
            optional: unit.optional,
            noMarks: unit.noMarks,
            noAssignments: unit.noAssignments,
            optionalUpload: unit.optionalUpload,
          })),
          newUnitTemplates: enrollment.course.newUnitTemplates.map(unit => ({
            unitTemplateId: this.uuidService.binToUUID(unit.unitTemplateId),
            courseId: unit.courseId,
            unitLetter: unit.unitLetter,
            title: unit.title,
            description: unit.description,
            markingCriteria: null, // students should never see the marking criteria
            optional: unit.optional,
            order: unit.order,
            created: unit.created,
            modified: unit.modified,
          })),
        },
        tutor: enrollment.tutor === null ? null : {
          tutorId: enrollment.tutor.tutorId,
          firstName: enrollment.tutor.firstName,
          lastName: enrollment.tutor.lastName,
          introduction: await this.isTutorIntroductionPresent(enrollment.tutorId, enrollment.course.code),
        },
        oldUnits: enrollment.oldUnits.map(unit => ({
          unitId: unit.unitId,
          enrollmentId: unit.enrollmentId,
          unitLetter: unit.unitLetter,
          title: unit.title,
          responseType: unit.responseType,
          responseFilename: unit.responseFilename,
          points: unit.points,
          mark: unit.mark,
          creationDate: unit.creationDate,
          finalizedDate: unit.finalizedDate,
          transferredDate: unit.transferredDate,
          tutorId: unit.tutorId,
          markedDate: unit.markedDate,
          tutorComment: null, // students should never see the tutor comment
          adminComment: unit.adminComment,
          optional: unit.optional,
          noMarks: unit.noMarks,
          noAssignments: unit.noAssignments,
          optionalUpload: unit.optionalUpload,
          order: unit.order,
          skipped: unit.skipped,
          cost: unit.cost?.toNumber() ?? null,
          currencyId: unit.currencyId,
          audioProgress: unit.audioProgress,
          timestamp: unit.timestamp,
          entityVersion: unit.entityVersion,
        })),
        newUnits: enrollment.newUnits.map(newUnit => {
          let unitComplete = true;
          let unitMarked = true;
          let unitPoints = 0;
          let unitMark = 0;
          for (const newAssignment of newUnit.newAssignments) {
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
          return {
            unitId: this.uuidService.binToUUID(newUnit.unitId),
            enrollmentId: newUnit.enrollmentId,
            tutorId: newUnit.tutorId,
            unitLetter: newUnit.unitLetter,
            title: newUnit.title,
            description: newUnit.description,
            markingCriteria: null, // students should never see the marking criteria
            optional: newUnit.optional,
            order: newUnit.order,
            tutorComment: null, // students should never see the tutor comment
            adminComment: newUnit.adminComment,
            submitted: newUnit.submitted,
            transferred: newUnit.transferred,
            closed: newUnit.closed,
            skipped: newUnit.skipped,
            responseFilename: newUnit.responseFilename === null ? null : `${enrollment.course.code}${enrollment.enrollmentId} Unit ${newUnit.unitLetter}.mp3`,
            responseFilesize: newUnit.responseFilesize,
            responseMimeTypeId: newUnit.responseMimeTypeId,
            complete: unitComplete,
            points: unitPoints,
            mark: newUnit.closed && unitMarked ? unitMark : null,
            created: newUnit.created,
            modified: newUnit.modified,
          };
        }),
      });

    } catch (err) {
      this.logger.error('error getting enrollment', err instanceof Error ? err.message : err);
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
