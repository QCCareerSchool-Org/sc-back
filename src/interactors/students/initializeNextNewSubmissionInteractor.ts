import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type InitializeNextNewSubmissionRequestDTO = {
  studentId: number;
  courseId: number;
};

export type InitializeNextNewSubmissionResponseDTO = NewSubmissionDTO;

export class InitializeNextNewSubmissionEnrollmentNotFound extends Error { }
export class InitializeNextNewSubmissionAssignmentsDisabled extends Error { }
export class InitializeNextCourseDisabled extends Error { }
export class InitializeNextNewSubmissionNotReady extends Error { }
export class InitializeNextNewSubmissionNoMoreSubmissions extends Error { }
export class InitializeNextNewSubmissionCantDetermineSubmission extends Error { }
export class InitializeNextNewSubmissionTemplateNotFound extends Error { }
export class InitializeNextNewSubmissionDefaultPriceNotFound extends Error { }
export class InitializeNextNewSubmissionMultipleDefaultPricesFound extends Error { }
export class InitializeNextNewSubmissionNoAssignmentsFound extends Error { }
export class InitializeNextNewSubmissionNoPartsFound extends Error { }
export class InitializeNextNewSubmissionNoInputsFound extends Error { }

export class InitializeNextNewSubmissionInteractor extends StudentInteractor<InitializeNextNewSubmissionRequestDTO, InitializeNextNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId }: InitializeNextNewSubmissionRequestDTO): Promise<ResultType<InitializeNextNewSubmissionResponseDTO>> {
    try {
      // look up the enrollment, student, course, and new submissions
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId },
        include: { student: true, course: true, newSubmissions: true },
      });

      this.checkEnrollment(enrollment);

      if (!enrollment) {
        return Result.fail(new InitializeNextNewSubmissionEnrollmentNotFound());
      }

      if (enrollment.assignmentsDisabled) {
        return Result.fail(new InitializeNextNewSubmissionAssignmentsDisabled());
      }

      // make sure there are no open (unskipped or unmarked) submissions
      if (!enrollment.newSubmissions.every(u => u.skipped || u.closed)) {
        return Result.fail(new InitializeNextNewSubmissionNotReady());
      }

      if (!enrollment.course.submissionsEnabled) {
        return Result.fail(new InitializeNextCourseDisabled());
      }

      // determine what the next submission should be
      const submissionTemplates = await this.prisma.newSubmissionTemplate.findMany({
        where: { courseId: enrollment.courseId },
        orderBy: [
          { order: 'asc' },
          { unitLetter: 'asc' },
        ],
      });
      let unitLetter: string | undefined = undefined;
      let submissionFound = false;
      for (const t of submissionTemplates) {
        if (!enrollment.newSubmissions.some(s => s.unitLetter === t.unitLetter)) {
          unitLetter = t.unitLetter;
          submissionFound = true;
          break;
        }
      }

      // no more submissions remaining
      if (!submissionFound) {
        return Result.fail(new InitializeNextNewSubmissionNoMoreSubmissions());
      }

      // this should never happen, but is needed for type safety
      if (typeof unitLetter === 'undefined') {
        return Result.fail(new InitializeNextNewSubmissionCantDetermineSubmission());
      }

      // Fix for DG120097
      const dg127361Fix = enrollment.newSubmissions.some(s => s.unitLetter === 'H' && s.title === 'The Teddy Bear Cut') && unitLetter === 'I';
      if (dg127361Fix) {
        unitLetter = 'H';
      }

      // find the submission template with all its children
      const nextSubmissionTemplate = await this.prisma.newSubmissionTemplate.findFirst({
        where: { courseId: enrollment.courseId, unitLetter },
        include: {
          newAssignmentTemplates: {
            include: {
              newPartTemplates: {
                include: {
                  newTextBoxTemplates: true,
                  newUploadSlotTemplates: true,
                  newPartMedia: true,
                },
              },
              newAssignmentMedia: true,
            },
          },
          prices: true,
        },
      });
      if (!nextSubmissionTemplate) {
        return Result.fail(new InitializeNextNewSubmissionTemplateNotFound());
      }

      const defaultPriceCount = nextSubmissionTemplate.prices.filter(p => p.countryId === null).length;
      if (defaultPriceCount < 1) {
        this.logger.error(`No default price found for ${this.uuidService.binToUUID(nextSubmissionTemplate.submissionTemplateId)}`);
        return Result.fail(new InitializeNextNewSubmissionDefaultPriceNotFound());
      }
      if (defaultPriceCount > 1) {
        this.logger.error(`Multiple default prices found for ${this.uuidService.binToUUID(nextSubmissionTemplate.submissionTemplateId)}`);
        return Result.fail(new InitializeNextNewSubmissionMultipleDefaultPricesFound());
      }

      // make sure the submission has assignments
      if (nextSubmissionTemplate.newAssignmentTemplates.length === 0) {
        return Result.fail(new InitializeNextNewSubmissionNoAssignmentsFound());
      }

      // make sure the each assignment has parts
      for (const assignment of nextSubmissionTemplate.newAssignmentTemplates) {
        if (assignment.newPartTemplates.length === 0) {
          return Result.fail(new InitializeNextNewSubmissionNoPartsFound());
        }

        // make sure each part has inputs
        for (const part of assignment.newPartTemplates) {
          if (part.newTextBoxTemplates.length === 0 && part.newUploadSlotTemplates.length === 0) {
            return Result.fail(new InitializeNextNewSubmissionNoInputsFound());
          }
        }
      }

      let submissionComplete = true;
      let submissionPoints = 0;

      const submissionId = this.uuidService.uuidToBin(this.uuidService.createUUID());

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      // copy the template data into a concrete submission
      const nextSubmission = await this.prisma.newSubmission.create({
        data: {
          submissionId,
          enrollmentId: enrollment.enrollmentId,
          tutorId: null,
          unitLetter: dg127361Fix ? 'I' : nextSubmissionTemplate.unitLetter,
          title: nextSubmissionTemplate.title,
          description: nextSubmissionTemplate.description,
          markingCriteria: nextSubmissionTemplate.markingCriteria,
          optional: nextSubmissionTemplate.optional,
          order: nextSubmissionTemplate.order,
          created: prismaNow,
          modified: prismaNow,
          newAssignments: {
            create: nextSubmissionTemplate.newAssignmentTemplates.map(newAssignmentTemplate => {
              let assignmentComplete = true;
              let assignmentPoints = 0;
              const assignment = {
                assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                assignmentNumber: newAssignmentTemplate.assignmentNumber,
                title: newAssignmentTemplate.title,
                description: newAssignmentTemplate.description,
                descriptionType: newAssignmentTemplate.descriptionType,
                markingCriteria: newAssignmentTemplate.markingCriteria,
                optional: newAssignmentTemplate.optional,
                created: prismaNow,
                modified: prismaNow,
                newParts: {
                  create: newAssignmentTemplate.newPartTemplates.map(newPartTemplate => {
                    let partComplete = true;
                    let partPoints = 0;
                    const part = {
                      partId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      partNumber: newPartTemplate.partNumber,
                      title: newPartTemplate.title,
                      description: newPartTemplate.description,
                      descriptionType: newPartTemplate.descriptionType,
                      markingCriteria: newPartTemplate.markingCriteria,
                      created: prismaNow,
                      modified: prismaNow,
                      newTextBoxes: {
                        create: newPartTemplate.newTextBoxTemplates.map(newTextBoxTemplate => {
                          if (!newTextBoxTemplate.optional) {
                            partComplete = false;
                            partPoints += newTextBoxTemplate.points;
                          }
                          return {
                            textBoxId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                            description: newTextBoxTemplate.description,
                            lines: newTextBoxTemplate.lines,
                            optional: newTextBoxTemplate.optional,
                            order: newTextBoxTemplate.order,
                            points: newTextBoxTemplate.points,
                            created: prismaNow,
                            modified: prismaNow,
                          };
                        }),
                      },
                      newUploadSlots: {
                        create: newPartTemplate.newUploadSlotTemplates.map(newUploadSlotTemplate => {
                          if (!newUploadSlotTemplate.optional) {
                            partComplete = false;
                            partPoints += newUploadSlotTemplate.points;
                          }
                          return {
                            uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                            label: newUploadSlotTemplate.label,
                            allowedTypes: newUploadSlotTemplate.allowedTypes,
                            optional: newUploadSlotTemplate.optional,
                            order: newUploadSlotTemplate.order,
                            points: newUploadSlotTemplate.points,
                            created: prismaNow,
                            modified: prismaNow,
                          };
                        }),
                      },
                      newPartMedia: {
                        create: newPartTemplate.newPartMedia.map(newPartMedium => ({
                          order: newPartMedium.order,
                          newPartMedium: {
                            connect: {
                              partMediumId: newPartMedium.partMediumId,
                            },
                          },
                        })),
                      },
                    };
                    if (!partComplete) {
                      assignmentComplete = false;
                    }
                    assignmentPoints += partPoints;
                    return part;
                  }),
                },
                newAssignmentMedia: {
                  create: newAssignmentTemplate.newAssignmentMedia.map(newAssignmentMedia => ({
                    order: newAssignmentMedia.order,
                    newAssignmentMedium: {
                      connect: {
                        assignmentMediumId: newAssignmentMedia.assignmentMediumId,
                      },
                    },
                  })),
                },
              };
              if (!assignmentComplete && !newAssignmentTemplate.optional) {
                submissionComplete = false;
              }
              // ignore incomplete, optional assignments
              if (assignmentComplete || !newAssignmentTemplate.optional) {
                submissionPoints += assignmentPoints;
              }
              return assignment;
            }),
          },
          prices: {
            create: nextSubmissionTemplate.prices.map(p => ({
              submissionPriceId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              countryId: p.countryId,
              price: p.price,
              currencyId: p.currencyId,
              created: prismaNow,
              modified: prismaNow,
            })),
          },
        },
        include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } }, parent: true },
      });

      return Result.success({
        submissionId: this.uuidService.binToUUID(nextSubmission.submissionId),
        enrollmentId: nextSubmission.enrollmentId,
        tutorId: nextSubmission.tutorId,
        unitLetter: nextSubmission.unitLetter,
        title: nextSubmission.title,
        description: nextSubmission.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: nextSubmission.optional,
        order: nextSubmission.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: nextSubmission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(nextSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(nextSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(nextSubmission.closed),
        skipped: nextSubmission.skipped,
        responseFilename: nextSubmission.responseFilename === null ? null : `${enrollment.course.code}${enrollment.enrollmentId} Submission ${nextSubmission.unitLetter}.mp3`,
        responseFilesize: nextSubmission.responseFilesize,
        responseMimeTypeId: nextSubmission.responseMimeTypeId,
        responseProgress: nextSubmission.responseProgress,
        redoId: nextSubmission.redoId === null ? null : this.uuidService.binToUUID(nextSubmission.redoId),
        hasParent: nextSubmission.parent !== null,
        complete: submissionComplete,
        points: submissionPoints,
        mark: null,
        created: this.dateService.fixPrismaReadDate(nextSubmission.created),
        modified: this.dateService.fixPrismaReadDate(nextSubmission.modified),
      });

    } catch (err) {
      this.logger.error('error initializing new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
