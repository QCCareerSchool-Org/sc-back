import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { NewUnitDTO } from '../../domain/newUnitDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InitializeNextNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
};

export type InitializeNextNewUnitResponseDTO = NewUnitDTO;

export class InitializeNextNewUnitEnrollmentNotFound extends Error { }
export class InitializeNextNewUnitStudentArrears extends Error { }
export class InitializeNextNewUnitEnrollmentOnHold extends Error { }
export class InitializeNextNewUnitNotReady extends Error { }
export class InitializeNextNewUnitNoMoreUnits extends Error { }
export class InitializeNextNewUnitCantDetermineUnit extends Error { }
export class InitializeNextNewUnitTemplateNotFound extends Error { }
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

      // see if there are any unskipped and unmarked units
      if (enrollment.newUnits.some(u => !u.skipped && !u.marked)) {
        return Result.fail(new InitializeNextNewUnitNotReady());
      }

      // Now we need to determine what the next unit will be
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
          newAssignments: {
            include: {
              newParts: {
                include: { newTextBoxes: true, newUploadSlots: true, mediaElements: true },
              },
              mediaElements: true,
            },
          },
        },
      });
      if (!nextUnitTemplate) {
        return Result.fail(new InitializeNextNewUnitTemplateNotFound());
      }

      console.log(nextUnitTemplate);

      // make sure the unit has assignments
      if (nextUnitTemplate.newAssignments.length === 0) {
        return Result.fail(new InitializeNextNewUnitNoAssignmentsFound());
      }

      // make sure the each assignment has parts
      for (const assignment of nextUnitTemplate.newAssignments) {
        if (assignment.newParts.length === 0) {
          return Result.fail(new InitializeNextNewUnitNoPartsFound());
        }

        // make sure each part has inputs
        for (const part of assignment.newParts) {
          if (part.newTextBoxes.length === 0 && part.newUploadSlots.length === 0) {
            return Result.fail(new InitializeNextNewUnitNoInputsFound());
          }
        }
      }

      // copy the template data into a concrete unit
      const nextUnit = await this.prisma.newUnit.create({
        data: {
          unitId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          enrollmentId: enrollment.enrollmentId,
          tutorId: null,
          unitLetter: nextUnitTemplate.unitLetter,
          title: nextUnitTemplate.title,
          description: nextUnitTemplate.description,
          optional: nextUnitTemplate.optional,
          order: nextUnitTemplate.order,
          newAssignments: {
            create: nextUnitTemplate.newAssignments.map(newAssignment => ({
              assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              assignmentNumber: newAssignment.assignmentNumber,
              title: newAssignment.title,
              description: newAssignment.description,
              optional: newAssignment.optional,
              parts: {
                create: newAssignment.newParts.map(newPart => ({
                  partId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  partNumber: newPart.partNumber,
                  title: newPart.title,
                  description: newPart.description,
                  optional: newPart.optional,
                  textBoxes: {
                    create: newPart.newTextBoxes.map(newTextBox => ({
                      textBoxId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      description: newTextBox.description,
                      lines: newTextBox.lines,
                      points: newTextBox.points,
                      optional: newTextBox.optional,
                      order: newTextBox.order,
                    })),
                  },
                  uploadSlots: {
                    create: newPart.newUploadSlots.map(newUploadSlot => ({
                      uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      label: newUploadSlot.label,
                      allowedTypes: newUploadSlot.allowedTypes,
                      points: newUploadSlot.points,
                      optional: newUploadSlot.optional,
                      order: newUploadSlot.order,
                    })),
                  },
                  mediaElements: {
                    create: newPart.mediaElements.map(mediaElement => ({
                      mediaElementId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      mimeTypeId: mediaElement.mimeTypeId,
                      externalData: mediaElement.externalData,
                    })),
                  },
                })),
              },
              mediaElements: {
                create: newAssignment.mediaElements.map(mediaElement => ({
                  mediaElementId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  mimeTypeId: mediaElement.mimeTypeId,
                  externalData: mediaElement.externalData,
                })),
              },
            })),
          },
        },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(nextUnit.unitId),
        enrollmentId: nextUnit.enrollmentId,
        tutorId: nextUnit.tutorId,
        unitLetter: nextUnit.unitLetter,
        title: nextUnit.title,
        description: nextUnit.description,
        optional: nextUnit.optional,
        order: nextUnit.order,
        adminComment: nextUnit.adminComment,
        submitted: nextUnit.submitted,
        skipped: nextUnit.skipped,
        transferred: nextUnit.transferred,
        marked: nextUnit.marked,
        complete: false,
        created: nextUnit.created,
        modified: nextUnit.modified,
      });

    } catch (err) {
      this.logger.error('error initializing new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
