import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/auditors/newSubmissionDTO.js';
import type { StudentDTO } from '../../domain/auditors/studentDTO.js';
import type { CountryDTO } from '../../domain/countryDTO.js';
import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { MaterialCompletionDTO } from '../../domain/materialCompletionDTO.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { OldSubmissionDTO } from '../../domain/oldSubmissionDTO.js';
import type { OldSubmissionTemplateDTO } from '../../domain/oldSubmissionTemplateDTO.js';
import type { ProvinceDTO } from '../../domain/provinceDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { TutorDTO } from '../../domain/tutorDTO.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type GetStudentRequestDTO = {
  auditorId: number;
  studentId: number;
};

export type GetStudentResponseDTO = StudentDTO & {
  country: CountryDTO;
  province: ProvinceDTO | null;
  enrollments: Array<EnrollmentDTO & {
    course: CourseDTO & {
      school: SchoolDTO;
      oldSubmissionTemplates: OldSubmissionTemplateDTO[];
      newSubmissionTemplates: NewSubmissionTemplateDTO[];
      units: Array<UnitDTO & {
        materials: Array<MaterialDTO & { materialData: Record<string, string> }>;
      }>;
    };
    tutor: TutorDTO | null;
    oldSubmissions: OldSubmissionDTO[];
    // newSubmissions: Array<NewSubmissionDTO & { badges: BadgeDTO[] }>;
    newSubmissions: NewSubmissionDTO[];
    materialCompletions: MaterialCompletionDTO[];
  }>;
  groups: string[];
};

export class StudentNotFound extends Error { }

export class GetStudentInteractor implements IInteractor<GetStudentRequestDTO, GetStudentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ auditorId, studentId }: GetStudentRequestDTO): Promise<ResultType<GetStudentResponseDTO>> {
    try {
      const student = await this.prisma.student.findFirst({
        where: { studentId, auditors: { some: { auditorId } } },
        include: {
          country: true,
          province: true,
          enrollments: {
            include: {
              course: {
                include: {
                  school: true,
                  newSubmissionTemplates: true,
                  oldSubmissionTemplates: true,
                  units: {
                    include: {
                      materials: { include: { materialData: true } },
                    },
                    orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
                  },
                },
              },
              tutor: true,
              oldSubmissions: true,
              newSubmissions: {
                include: {
                  newAssignments: {
                    include: {
                      newParts: {
                        include: {
                          newTextBoxes: { orderBy: [ { order: 'asc' } ] },
                          newUploadSlots: { orderBy: [ { order: 'asc' } ] },
                        },
                        orderBy: [ { partNumber: 'asc' } ],
                      },
                    },
                    orderBy: [ { assignmentNumber: 'asc' } ],
                  },
                  // badges: { include: { badge: true } },
                },
                orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
              },
              materialCompletions: true,
            },
          },
          groups: { include: { group: true } },
        },
      });

      if (!student) {
        return Result.fail(new StudentNotFound());
      }

      return Result.success({
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
        emailAddress: undefined,
        arrears: student.arrears,
        forumUsername: student.forumUsername,
        apiUsername: student.apiUsername,
        questionnaire: student.questionnaire,
        videoViewed: student.videoViewed,
        ajaxUploads: student.ajaxUploads,
        upgradeNotification: student.upgradeNotification,
        entityVersion: student.entityVersion,
        created: this.dateService.fixPrismaReadDate(student.created),
        modified: this.dateService.fixPrismaReadDate(student.modified),
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
        enrollments: await Promise.all(student.enrollments.map(async e => ({
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
          course: {
            courseId: e.course.courseId,
            schoolId: e.course.schoolId,
            code: e.course.code,
            version: e.course.version,
            studentTypeId: e.course.studentTypeId,
            name: e.course.name,
            courseGuide: e.course.courseGuide,
            quizzesEnabled: e.course.quizzesEnabled,
            noTutor: e.course.noTutor,
            submissionType: e.course.submissionType,
            order: e.course.order,
            enabled: e.course.enabled,
            submissionsEnabled: e.course.submissionsEnabled,
            entityVersion: e.course.entityVersion,
            school: {
              schoolId: e.course.school.schoolId,
              name: e.course.school.name,
              slug: e.course.school.slug,
              order: e.course.school.order,
              entityVersion: e.course.school.entityVersion,
            },
            oldSubmissionTemplates: e.course.oldSubmissionTemplates.map(s => ({
              submissionTemplateId: s.submissionTemplateId,
              courseId: s.courseId,
              unitLetter: s.unitLetter,
              title: s.title,
              responseType: s.responseType,
              optional: s.optional,
              noMarks: s.noMarks,
              noAssignments: s.noAssignments,
              optionalUpload: s.optionalUpload,
            })),
            newSubmissionTemplates: e.course.newSubmissionTemplates.map(s => ({
              submissionTemplateId: this.uuidService.binToUUID(s.submissionTemplateId),
              courseId: s.courseId,
              unitLetter: s.unitLetter,
              title: s.title,
              description: s.description,
              markingCriteria: null,
              optional: s.optional,
              order: s.order,
              created: this.dateService.fixPrismaReadDate(s.created),
              modified: this.dateService.fixPrismaReadDate(s.modified),
            })),
            units: e.course.units.map(u => ({
              unitId: this.uuidService.binToUUID(u.unitId),
              courseId: u.courseId,
              unitLetter: u.unitLetter,
              title: u.title,
              order: u.order,
              created: this.dateService.fixPrismaReadDate(u.created),
              modified: this.dateService.fixPrismaReadDate(u.modified),
              materials: u.materials.map(m => {
                const materialData = m.materialData.reduce<Record<string, string>>((prev, cur) => {
                  prev[cur.key] = cur.value;
                  return prev;
                }, {});
                return {
                  materialId: this.uuidService.binToUUID(m.materialId),
                  unitId: this.uuidService.binToUUID(m.unitId),
                  type: m.type,
                  title: m.title,
                  description: m.description,
                  order: m.order,
                  filename: m.filename,
                  contentMimeTypeId: m.contentMimeTypeId,
                  imageMimeTypeId: m.imageMimeTypeId,
                  externalData: m.externalData,
                  entryPoint: m.entryPoint,
                  minutes: m.minutes,
                  chapters: m.chapters,
                  videos: m.videos,
                  knowledgeChecks: m.knowledgeChecks,
                  created: this.dateService.fixPrismaReadDate(m.created),
                  modified: this.dateService.fixPrismaReadDate(m.modified),
                  materialData,
                };
              }),
            })),
          },
          tutor: e.tutor === null ? null : {
            tutorId: e.tutor.tutorId,
            firstName: e.tutor.firstName,
            lastName: e.tutor.lastName,
            introduction: await this.isTutorIntroductionPresent(e.tutorId, e.course.code),
          },
          oldSubmissions: e.oldSubmissions.map(submission => ({
            submissionId: submission.submissionId,
            enrollmentId: submission.enrollmentId,
            unitLetter: submission.unitLetter,
            title: submission.title,
            responseType: submission.responseType,
            responseFilename: submission.responseFilename,
            points: submission.points,
            mark: submission.mark,
            creationDate: this.dateService.fixPrismaReadDate(submission.creationDate),
            finalizedDate: this.dateService.fixPrismaReadDate(submission.finalizedDate),
            transferredDate: this.dateService.fixPrismaReadDate(submission.transferredDate),
            tutorId: submission.tutorId,
            markedDate: this.dateService.fixPrismaReadDate(submission.markedDate),
            tutorComment: null, // students should never see the tutor comment
            adminComment: submission.adminComment,
            optional: submission.optional,
            noMarks: submission.noMarks,
            noAssignments: submission.noAssignments,
            optionalUpload: submission.optionalUpload,
            order: submission.order,
            skipped: submission.skipped,
            cost: submission.cost?.toNumber() ?? null,
            currencyId: submission.currencyId,
            audioProgress: submission.audioProgress,
            timestamp: this.dateService.fixPrismaReadDate(submission.timestamp),
            entityVersion: submission.entityVersion,
          })),
          newSubmissions: e.newSubmissions.map(newSubmission => {
            let submissionComplete = true;
            let submissionMarked = true;
            let submissionPoints = 0;
            let submissionMark = 0;
            for (const newAssignment of newSubmission.newAssignments) {
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
                    partMark += newTextBox.markOverride ?? newTextBox.mark ?? 0;
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
                    partMark += newUploadSlot.markOverride ?? newUploadSlot.mark ?? 0;
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
                submissionComplete = false;
              }
              if (assignmentComplete && !assignmentMarked) {
                submissionMarked = false;
              }
              if (assignmentComplete || !newAssignment.optional) {
                submissionPoints += assignmentPoints;
                submissionMark += assignmentMark;
              }
            }
            return {
              submissionId: this.uuidService.binToUUID(newSubmission.submissionId),
              enrollmentId: newSubmission.enrollmentId,
              tutorId: newSubmission.tutorId,
              unitLetter: newSubmission.unitLetter,
              title: newSubmission.title,
              description: newSubmission.description,
              markingCriteria: null, // students should never see the marking criteria
              optional: newSubmission.optional,
              order: newSubmission.order,
              tutorComment: null, // students should never see the tutor comment
              adminComment: newSubmission.adminComment,
              submitted: this.dateService.fixPrismaReadDate(newSubmission.submitted),
              transferred: this.dateService.fixPrismaReadDate(newSubmission.transferred),
              closed: this.dateService.fixPrismaReadDate(newSubmission.closed),
              skipped: newSubmission.skipped,
              responseFilename: newSubmission.responseFilename === null ? null : `${e.course.code}${e.enrollmentId} Submission ${newSubmission.unitLetter}.mp3`,
              responseFilesize: newSubmission.responseFilesize,
              responseMimeTypeId: newSubmission.responseMimeTypeId,
              responseProgress: newSubmission.responseProgress,
              complete: submissionComplete,
              points: submissionPoints,
              mark: newSubmission.closed && submissionMarked ? submissionMark : null,
              created: this.dateService.fixPrismaReadDate(newSubmission.created),
              modified: this.dateService.fixPrismaReadDate(newSubmission.modified),
              // badges: newSubmission.badges.map(b => ({
              //   badgeId: this.uuidService.binToUUID(b.badge.badgeId),
              //   name: b.badge.name,
              //   description: b.badge.name,
              //   created: b.created,
              // })),
            };
          }),
          materialCompletions: e.materialCompletions.map(m => ({
            materialId: this.uuidService.binToUUID(m.materialId),
            enrollmentId: m.enrollmentId,
          })),
        }))),
        groups: student.groups.map(g => g.group.name),
      });

    } catch (err) {
      this.logger.error('error getting student', err instanceof Error ? err.message : err);
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
