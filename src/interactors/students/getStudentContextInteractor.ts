import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { ContextDTO } from '../../domain/students/context.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetStudentContextRequestDTO = {
  studentId: number;
};

export type GetStudentContextResponseDTO = ContextDTO;

abstract class GetStudentContextError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class GetStudentContextNotFound extends GetStudentContextError { }

export class GetStudentContextInteractor extends StudentInteractor<GetStudentContextRequestDTO, GetStudentContextResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId }: GetStudentContextRequestDTO): Promise<ResultType<GetStudentContextResponseDTO>> {
    try {
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: {
          country: true,
          province: true,
          enrollments: {
            where: { course: { enabled: true } },
            orderBy: [ { course: { school: { order: 'asc' } } }, { course: { order: 'asc' } } ],
            include: {
              course: { include: { school: true, variant: true } },
              tutor: true,
              newSubmissions: {
                orderBy: { order: 'asc' },
                include: {
                  newAssignments: {
                    orderBy: { assignmentNumber: 'asc' },
                    include: {
                      newParts: {
                        include: {
                          newTextBoxes: true,
                          newUploadSlots: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!student) {
        return failure(new GetStudentContextNotFound());
      }

      return success({
        studentId: student.studentId,
        countryId: student.countryId,
        provinceId: student.provinceId,
        studentTypeId: student.studentTypeId,
        passwordChanged: student.passwordChanged,
        sex: student.sex,
        firstName: student.firstName,
        lastName: student.lastName,
        numLogins: student.numLogins,
        lastLogin: this.dateService.fixPrismaReadDate(student.lastLogin),
        expiry: this.dateService.fixPrismaReadDate(student.expiry),
        emailAddress: student.emailAddress,
        arrears: student.arrears,
        forumUsername: student.forumUsername,
        forumPasswordNew: student.forumPasswordNew,
        apiUsername: student.apiUsername,
        apiPasswordNew: student.apiPasswordNew,
        questionnaire: student.questionnaire,
        videoViewed: student.videoViewed,
        ajaxUploads: student.ajaxUploads,
        upgradeNotification: student.upgradeNotification,
        entityVersion: student.entityVersion,
        created: this.dateService.fixPrismaReadDate(student.created),
        modified: this.dateService.fixPrismaReadDate(student.modified),
        hasCASocialInsuranceNumber: false,
        country: {
          countryId: student.country.countryId,
          code: student.country.code,
          name: student.country.name,
          entityVersion: student.country.entityVersion,
        },
        province: student.province === null ? null : {
          provinceId: student.province.provinceId,
          countryId: student.province.countryId,
          regionId: student.province.regionId,
          code: student.province.code,
          name: student.province.name,
          regionCode: student.province.regionCode,
          alternateAbbreviation: student.province.alternateAbbreviation,
          type: student.province.type,
          entityVersion: student.province.entityVersion,
        },
        enrollments: student.enrollments.map(e => ({
          enrollmentId: e.enrollmentId,
          courseId: e.courseId,
          studentId: e.studentId,
          studentNumber: e.studentNumber,
          tutorId: e.tutorId,
          maxAssignments: e.maxAssignments,
          graduated: e.graduated,
          assignmentsDisabled: e.assignmentsDisabled,
          quizzesDisabled: e.quizzesDisabled,
          onHold: e.onHold,
          holdReason: e.holdReason,
          currencyCode: e.currencyCode,
          courseCost: e.courseCost.toNumber(),
          amountPaid: e.amountPaid.toNumber(),
          monthlyInstallment: e.monthlyInstallment === null ? null : e.monthlyInstallment.toNumber(),
          enrollmentDate: this.dateService.fixPrismaReadDate(e.enrollmentDate),
          dueDate: this.dateService.fixPrismaReadDate(e.dueDate),
          fastTrack: e.fastTrack,
          paymentsDisabled: e.paymentsDisabled,
          updated: e.updated,
          entityVersion: e.entityVersion,
          course: {
            courseId: e.course.courseId,
            schoolId: e.course.schoolId,
            variantId: e.course.variantId,
            code: e.course.code,
            version: e.course.version,
            studentTypeId: e.course.studentTypeId,
            name: e.course.name,
            subheading: e.course.subheading,
            courseGuide: e.course.courseGuide,
            quizzesEnabled: e.course.quizzesEnabled,
            noTutor: e.course.noTutor,
            submissionType: e.course.submissionType,
            enabled: e.course.enabled,
            order: e.course.order,
            submissionsEnabled: e.course.submissionsEnabled,
            entityVersion: e.course.entityVersion,
            school: {
              schoolId: e.course.school.schoolId,
              name: e.course.school.name,
              slug: e.course.school.slug,
              order: e.course.school.order,
              entityVersion: e.course.school.entityVersion,
            },
            variant: e.course.variant === null ? null : {
              variantId: e.course.variant.variantId,
              name: e.course.variant.name,
            },
          },
          tutor: e.tutor === null ? null : {
            tutorId: e.tutor.tutorId,
            firstName: e.tutor.firstName,
            lastName: e.tutor.lastName,
            introduction: false,
          },
          submissions: e.newSubmissions.map(s => {
            let submissionComplete = true;
            let submissionMarked = true;
            let submissionPoints = 0;
            let submissionMark = 0;

            const assignments = s.newAssignments.map(a => {
              let assignmentComplete = true;
              let assignmentMarked = true;
              let assignmentPoints = 0;
              let assignmentMark = 0;

              a.newParts.forEach(p => {
                let partComplete = true;
                let partMarked = true;
                let partPoints = 0;
                let partMark = 0;

                p.newTextBoxes.forEach(t => {
                  const textBoxComplete = t.text.length > 0;
                  if (!t.optional && !textBoxComplete) { partComplete = false; }
                  if (textBoxComplete && t.mark === null && t.points > 0) { partMarked = false; }
                  if (textBoxComplete || !t.optional) {
                    partPoints += t.points;
                    partMark += t.markOverride ?? t.mark ?? 0;
                  }
                });

                p.newUploadSlots.forEach(u => {
                  const uploadSlotComplete = u.filename !== null;
                  if (!u.optional && !uploadSlotComplete) { partComplete = false; }
                  if (uploadSlotComplete && u.mark === null && u.points > 0) { partMarked = false; }
                  if (uploadSlotComplete || !u.optional) {
                    partPoints += u.points;
                    partMark += u.markOverride ?? u.mark ?? 0;
                  }
                });

                if (!partComplete) { assignmentComplete = false; }
                if (partComplete && !partMarked) { assignmentMarked = false; }
                assignmentPoints += partPoints;
                assignmentMark += partMark;
              });

              if (!a.optional && !assignmentComplete) { submissionComplete = false; }
              if (assignmentComplete || !a.optional) {
                submissionPoints += assignmentPoints;
                submissionMark += assignmentMark;
              }
              if (assignmentComplete && !assignmentMarked) { submissionMarked = false; }

              return {
                assignmentId: this.uuidService.binToUUID(a.assignmentId),
                submissionId: this.uuidService.binToUUID(a.submissionId),
                assignmentNumber: a.assignmentNumber,
                title: a.title,
                description: a.description,
                descriptionType: a.descriptionType,
                markingCriteria: null,
                optional: a.optional,
                complete: assignmentComplete,
                points: assignmentPoints,
                mark: s.closed && assignmentMarked ? assignmentMark : null,
                created: this.dateService.fixPrismaReadDate(a.created),
                modified: this.dateService.fixPrismaReadDate(a.modified),
              };
            });

            return {
              submissionId: this.uuidService.binToUUID(s.submissionId),
              enrollmentId: s.enrollmentId,
              tutorId: s.tutorId,
              unitLetter: s.unitLetter,
              title: s.title,
              description: s.description,
              markingCriteria: null,
              tutorComment: null,
              optional: s.optional,
              order: s.order,
              adminComment: s.adminComment,
              submitted: this.dateService.fixPrismaReadDate(s.submitted),
              transferred: this.dateService.fixPrismaReadDate(s.transferred),
              closed: this.dateService.fixPrismaReadDate(s.closed),
              skipped: s.skipped,
              responseFilename: s.responseFilename,
              responseFilesize: s.responseFilesize,
              responseMimeTypeId: s.responseMimeTypeId,
              responseProgress: s.responseProgress,
              redoId: s.redoId === null ? null : this.uuidService.binToUUID(s.redoId),
              hasParent: false,
              complete: submissionComplete,
              points: submissionPoints,
              mark: s.closed && submissionMarked ? submissionMark : null,
              created: this.dateService.fixPrismaReadDate(s.created),
              modified: this.dateService.fixPrismaReadDate(s.modified),
              assignments,
            };
          }),
        })),
      });

    } catch (err) {
      this.logger.error('error getting student context', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
