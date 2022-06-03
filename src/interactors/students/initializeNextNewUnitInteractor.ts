import type { PrismaClient } from '@prisma/client';

import type { NewUnitDTO } from '../../domain/newUnitDTO.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type InitializeNextNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
};

export type InitializeNextNewUnitResponseDTO = NewUnitDTO;

export class InitializeNextNewUnitEnrollmentNotFound extends Error { }
export class InitializeNextNewUnitStudentArrears extends Error { }
export class InitializeNextNewUnitEnrollmentOnHold extends Error { }
export class InitializeNextCourseDisabled extends Error { }
export class InitializeNextNewUnitNotReady extends Error { }
export class InitializeNextNewUnitNoMoreUnits extends Error { }
export class InitializeNextNewUnitCantDetermineUnit extends Error { }
export class InitializeNextNewUnitTemplateNotFound extends Error { }
export class InitializeNextNewUnitDefaultPriceNotFound extends Error { }
export class InitializeNextNewUnitMultipleDefaultPricesFound extends Error { }
export class InitializeNextNewUnitNoAssignmentsFound extends Error { }
export class InitializeNextNewUnitNoPartsFound extends Error { }
export class InitializeNextNewUnitNoInputsFound extends Error { }

export class InitializeNextNewUnitInteractor implements IInteractor<InitializeNextNewUnitRequestDTO, InitializeNextNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, courseId }: InitializeNextNewUnitRequestDTO): Promise<ResultType<InitializeNextNewUnitResponseDTO>> {
    try {
      // look up the enrollment, student, course, and new units
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, courseId, course: { enabled: true } },
        include: { student: true, course: true, newUnits: true },
      });
      if (!enrollment) {
        return Result.fail(new InitializeNextNewUnitEnrollmentNotFound());
      }

      if (enrollment.student.arrears) {
        return Result.fail(new InitializeNextNewUnitStudentArrears());
      }

      if (enrollment.onHold) {
        return Result.fail(new InitializeNextNewUnitEnrollmentOnHold());
      }

      // make sure there are no open (unskipped or unmarked) units
      if (!enrollment.newUnits.every(u => u.skipped || u.closed)) {
        return Result.fail(new InitializeNextNewUnitNotReady());
      }

      if (!enrollment.course.newUnitsEnabled) {
        return Result.fail(new InitializeNextCourseDisabled());
      }

      // determine what the next unit should be
      const unitTemplates = await this.prisma.newUnitTemplate.findMany({
        where: { courseId: enrollment.courseId },
        orderBy: [
          { order: 'asc' },
          { unitLetter: 'asc' },
        ],
      });
      let unitLetter: string | undefined = undefined;
      let unitFound = false;
      for (const t of unitTemplates) {
        if (!enrollment.newUnits.some(u => u.unitLetter === t.unitLetter)) {
          unitLetter = t.unitLetter;
          unitFound = true;
          break;
        }
      }

      // no more units remaining
      if (!unitFound) {
        return Result.fail(new InitializeNextNewUnitNoMoreUnits());
      }

      // this should never happen, but is needed for type safety
      if (typeof unitLetter === 'undefined') {
        return Result.fail(new InitializeNextNewUnitCantDetermineUnit());
      }

      // find the unit template with all its children
      const nextUnitTemplate = await this.prisma.newUnitTemplate.findFirst({
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
      if (!nextUnitTemplate) {
        return Result.fail(new InitializeNextNewUnitTemplateNotFound());
      }

      const defaultPriceCount = nextUnitTemplate.prices.filter(p => p.countryId === null).length;
      if (defaultPriceCount < 1) {
        this.logger.error(`No default price found for ${this.uuidService.binToUUID(nextUnitTemplate.unitTemplateId)}`);
        return Result.fail(new InitializeNextNewUnitDefaultPriceNotFound());
      }
      if (defaultPriceCount > 1) {
        this.logger.error(`Multiple default prices found for ${this.uuidService.binToUUID(nextUnitTemplate.unitTemplateId)}`);
        return Result.fail(new InitializeNextNewUnitMultipleDefaultPricesFound());
      }

      // make sure the unit has assignments
      if (nextUnitTemplate.newAssignmentTemplates.length === 0) {
        return Result.fail(new InitializeNextNewUnitNoAssignmentsFound());
      }

      // make sure the each assignment has parts
      for (const assignment of nextUnitTemplate.newAssignmentTemplates) {
        if (assignment.newPartTemplates.length === 0) {
          return Result.fail(new InitializeNextNewUnitNoPartsFound());
        }

        // make sure each part has inputs
        for (const part of assignment.newPartTemplates) {
          if (part.newTextBoxTemplates.length === 0 && part.newUploadSlotTemplates.length === 0) {
            return Result.fail(new InitializeNextNewUnitNoInputsFound());
          }
        }
      }

      let unitComplete = true;
      let unitPoints = 0;

      const unitId = this.uuidService.uuidToBin(this.uuidService.createUUID());

      // copy the template data into a concrete unit
      const nextUnit = await this.prisma.newUnit.create({
        data: {
          unitId,
          enrollmentId: enrollment.enrollmentId,
          tutorId: null,
          unitLetter: nextUnitTemplate.unitLetter,
          title: nextUnitTemplate.title,
          description: nextUnitTemplate.description,
          markingCriteria: nextUnitTemplate.markingCriteria,
          optional: nextUnitTemplate.optional,
          order: nextUnitTemplate.order,
          newAssignments: {
            create: nextUnitTemplate.newAssignmentTemplates.map(newAssignmentTemplate => {
              let assignmentComplete = true;
              let assignmentPoints = 0;
              const assignment = {
                assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                assignmentNumber: newAssignmentTemplate.assignmentNumber,
                title: newAssignmentTemplate.title,
                description: newAssignmentTemplate.description,
                markingCriteria: newAssignmentTemplate.markingCriteria,
                optional: newAssignmentTemplate.optional,
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
                unitComplete = false;
              }
              // ignore incomplete, optional assignments
              if (assignmentComplete || !newAssignmentTemplate.optional) {
                unitPoints += assignmentPoints;
              }
              return assignment;
            }),
          },
          prices: {
            create: nextUnitTemplate.prices.map(p => ({
              unitPriceId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              countryId: p.countryId,
              price: p.price,
              currencyId: p.currencyId,
            })),
          },
        },
        include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(nextUnit.unitId),
        enrollmentId: nextUnit.enrollmentId,
        tutorId: nextUnit.tutorId,
        unitLetter: nextUnit.unitLetter,
        title: nextUnit.title,
        description: nextUnit.description,
        markingCriteria: null, // students should never see the marking criteria
        optional: nextUnit.optional,
        order: nextUnit.order,
        tutorComment: null, // students should never see the tutor comment
        adminComment: nextUnit.adminComment,
        submitted: nextUnit.submitted,
        transferred: nextUnit.transferred,
        closed: nextUnit.closed,
        skipped: nextUnit.skipped,
        responseFilename: nextUnit.responseFilename === null ? null : `${enrollment.course.code}${enrollment.enrollmentId} Unit ${nextUnit.unitLetter}.mp3`,
        responseFilesize: nextUnit.responseFilesize,
        responseMimeTypeId: nextUnit.responseMimeTypeId,
        complete: unitComplete,
        points: unitPoints,
        mark: null,
        created: nextUnit.created,
        modified: nextUnit.modified,
      });

    } catch (err) {
      this.logger.error('error initializing new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
