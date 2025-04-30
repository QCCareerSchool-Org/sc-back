import type { PrismaClient } from '@prisma/client';

import type { CourseDTO } from '../../domain/courseDTO.js';
import type { EnrollmentDTO } from '../../domain/enrollmentDTO.js';
import type { MaterialCompletionDTO } from '../../domain/materialCompletionDTO.js';
import type { MaterialDTO } from '../../domain/materialDTO.js';
import type { MetadataDTO } from '../../domain/metadataDTO.js';
import type { NewSubmissionTemplateDTO } from '../../domain/newSubmissionTemplateDTO.js';
import type { OldSubmissionDTO } from '../../domain/oldSubmissionDTO.js';
import type { OldSubmissionTemplateDTO } from '../../domain/oldSubmissionTemplateDTO.js';
import type { SchoolDTO } from '../../domain/schoolDTO.js';
import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { StudentDTO } from '../../domain/students/studentDTO.js';
import type { TutorDTO } from '../../domain/tutorDTO.js';
import type { UnitDTO } from '../../domain/unitDTO.js';
import type { VariantDTO } from '../../domain/variantDTO.js';
import type { VideoDTO } from '../../domain/videoDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetEnrollmentRequestDTO = {
  studentId: number;
  courseId: number;
};

export type GetEnrollmentResponseDTO = EnrollmentDTO & {
  student: StudentDTO;
  course: CourseDTO & {
    school: SchoolDTO;
    variant: VariantDTO | null;
    oldSubmissionTemplates: OldSubmissionTemplateDTO[];
    newSubmissionTemplates: NewSubmissionTemplateDTO[];
    units: Array<UnitDTO & {
      materials: Array<MaterialDTO & { complete: boolean; materialData: Record<string, string> }>;
      videos: VideoDTO[];
    }>;
  };
  tutor: TutorDTO | null;
  oldSubmissions: OldSubmissionDTO[];
  // newSubmissions: Array<NewSubmissionDTO & { badges: BadgeDTO[] }>;
  newSubmissions: NewSubmissionDTO[];
  materialCompletions: MaterialCompletionDTO[];
  metadata: MetadataDTO[];
};

export class GetEnrollmentNotFound extends Error { }

export class GetEnrollmentInteractor extends StudentInteractor<GetEnrollmentRequestDTO, GetEnrollmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId }: GetEnrollmentRequestDTO): Promise<ResultType<GetEnrollmentResponseDTO>> {
    try {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: {
          student: { include: { caSocialInsuranceNumber: true } },
          course: {
            include: {
              school: true,
              variant: true,
              newSubmissionTemplates: true,
              oldSubmissionTemplates: true,
              units: {
                include: {
                  materials: {
                    include: {
                      materialCompletions: { where: { enrollment: { studentId, courseId } } },
                      materialData: { where: { enrollment: { studentId, courseId } } },
                    },
                    orderBy: [ { order: 'asc' }, { materialId: 'asc' } ],
                  },
                  videos: { include: { video: true } },
                },
                orderBy: [ { order: 'asc' }, { unitLetter: 'asc' } ],
              },
            },
          },
          tutor: true,
          oldSubmissions: true,
          newSubmissions: {
            include: {
              parent: true,
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
          metadata: { include: { metadata: true } },
        },
      });

      if (!enrollment) {
        return Result.fail(new GetEnrollmentNotFound());
      }

      return Result.success({
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        studentId: enrollment.studentId,
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
        enrollmentDate: this.dateService.fixPrismaReadDate(enrollment.enrollmentDate),
        dueDate: this.dateService.fixPrismaReadDate(enrollment.dueDate),
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
          lastLogin: this.dateService.fixPrismaReadDate(enrollment.student.lastLogin),
          expiry: this.dateService.fixPrismaReadDate(enrollment.student.expiry),
          emailAddress: enrollment.student.emailAddress,
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
          created: this.dateService.fixPrismaReadDate(enrollment.student.created),
          modified: this.dateService.fixPrismaReadDate(enrollment.student.modified),
          hasCASocialInsuranceNumber: !!enrollment.student.caSocialInsuranceNumber,
        },
        course: {
          courseId: enrollment.course.courseId,
          schoolId: enrollment.course.schoolId,
          variantId: enrollment.course.variantId,
          code: enrollment.course.code,
          version: enrollment.course.version,
          studentTypeId: enrollment.course.studentTypeId,
          name: enrollment.course.name,
          courseGuide: enrollment.course.courseGuide,
          quizzesEnabled: enrollment.course.quizzesEnabled,
          noTutor: enrollment.course.noTutor,
          submissionType: enrollment.course.submissionType,
          enabled: enrollment.course.enabled,
          order: enrollment.course.order,
          submissionsEnabled: enrollment.course.submissionsEnabled,
          entityVersion: enrollment.course.entityVersion,
          school: {
            schoolId: enrollment.course.school.schoolId,
            name: enrollment.course.school.name,
            slug: enrollment.course.school.slug,
            order: enrollment.course.school.order,
            entityVersion: enrollment.course.school.entityVersion,
          },
          variant: enrollment.course.variant === null ? null : {
            variantId: enrollment.course.variant.variantId,
            name: enrollment.course.variant.name,
          },
          oldSubmissionTemplates: enrollment.course.oldSubmissionTemplates.map(s => ({
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
          newSubmissionTemplates: enrollment.course.newSubmissionTemplates.map(s => ({
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
          units: enrollment.course.units.map(u => ({
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

              const complete = m.materialCompletions.length > 0 || materialData['cmi.completion_status'] === 'completed';

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
                complete,
              };
            }),
            videos: u.videos.map(v => ({
              videoId: this.uuidService.binToUUID(v.videoId),
              src: v.video.src,
              posterSrc: v.video.posterSrc,
              captionSrc: v.video.captionSrc,
              title: v.video.title,
              description: v.video.description,
            })),
          })),
        },
        tutor: enrollment.tutor === null ? null : {
          tutorId: enrollment.tutor.tutorId,
          firstName: enrollment.tutor.firstName,
          lastName: enrollment.tutor.lastName,
          introduction: await this.isTutorIntroductionPresent(enrollment.tutorId, enrollment.course.code),
        },
        oldSubmissions: enrollment.oldSubmissions.map(submission => ({
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
        newSubmissions: enrollment.newSubmissions.map(newSubmission => {
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
            responseFilename: newSubmission.responseFilename === null ? null : `${enrollment.course.code}${enrollment.enrollmentId} Submission ${newSubmission.unitLetter}.mp3`,
            responseFilesize: newSubmission.responseFilesize,
            responseMimeTypeId: newSubmission.responseMimeTypeId,
            responseProgress: newSubmission.responseProgress,
            redoId: newSubmission.redoId === null ? null : this.uuidService.binToUUID(newSubmission.redoId),
            hasParent: newSubmission.parent !== null,
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
        materialCompletions: enrollment.materialCompletions.map(m => ({
          materialId: this.uuidService.binToUUID(m.materialId),
          enrollmentId: m.enrollmentId,
        })),
        metadata: enrollment.metadata.map(m => ({
          name: m.metadata.name,
          value: m.value,
        })),
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
    const tutorAudioFileLocation = `${this.configService.config.paths.tutorIntroductionPath}/${tutorId}-${courseCode}.mp3`;
    const fileStats = await this.fileService.stat(tutorAudioFileLocation);
    if (fileStats) {
      return true;
    }
    return false;
  }
}
