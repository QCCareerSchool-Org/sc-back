import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import { NewUnitDTO } from '../../domain/student/newUnitDTO';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
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

      // this should never happen, but is needed type safety
      if (typeof unitLetter === 'undefined') {
        return Result.fail(new InitializeNextNewUnitCantDetermineUnit());
      }

      // find the unit template with all its children
      const nextUnitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { courseId: enrollment.courseId, unitLetter },
        include: {
          assignments: {
            include: {
              parts: {
                include: { textBoxes: true, uploadSlots: true, mediaElements: true },
              },
              mediaElements: true,
            },
          },
        },
      });
      if (!nextUnitTemplate) {
        return Result.fail(new InitializeNextNewUnitTemplateNotFound());
      }

      // make sure the unit has assignments
      if (nextUnitTemplate.assignments.length === 0) {
        return Result.fail(new InitializeNextNewUnitNoAssignmentsFound());
      }

      // make sure the each assignment has parts
      for (const assignment of nextUnitTemplate.assignments) {
        if (assignment.parts.length === 0) {
          return Result.fail(new InitializeNextNewUnitNoPartsFound());
        }

        // make sure each part has inputs
        for (const part of assignment.parts) {
          if (part.textBoxes.length === 0 && part.uploadSlots.length === 0) {
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
          assignments: {
            create: nextUnitTemplate.assignments.map(assignment => ({
              assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              assignmentNumber: assignment.assignmentNumber,
              title: assignment.title,
              description: assignment.description,
              optional: assignment.optional,
              parts: {
                create: assignment.parts.map(part => ({
                  partId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  partNumber: part.partNumber,
                  title: part.title,
                  description: part.description,
                  optional: part.optional,
                  textBoxes: {
                    create: part.textBoxes.map(textBox => ({
                      textBoxId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      description: textBox.description,
                      lines: textBox.lines,
                      points: textBox.points,
                      optional: textBox.optional,
                      order: textBox.order,
                    })),
                  },
                  uploadSlots: {
                    create: part.uploadSlots.map(uploadSlot => ({
                      uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      label: uploadSlot.label,
                      allowedTypes: uploadSlot.allowedTypes,
                      points: uploadSlot.points,
                      optional: uploadSlot.optional,
                      order: uploadSlot.order,
                    })),
                  },
                  mediaElements: {
                    create: part.mediaElements.map(mediaElement => ({
                      mediaElementId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      mimeTypeId: mediaElement.mimeTypeId,
                      externalData: mediaElement.externalData,
                    })),
                  },
                })),
              },
              mediaElements: {
                create: assignment.mediaElements.map(mediaElement => ({
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
        adminComment: nextUnit.adminComment,
        submitted: nextUnit.submitted,
        skipped: nextUnit.skipped,
        transferred: nextUnit.transferred,
        marked: nextUnit.marked,
        created: nextUnit.created,
        complete: false,
      });

    } catch (err) {
      this.logger.error('error initializing new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
