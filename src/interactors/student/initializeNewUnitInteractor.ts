import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InitializeNewUnitRequestDTO = {
  studentId: number;
  enrollmentId: number;
  unitLetter: string;
};

export type InitializeNewUnitResponseDTO = {
  unitId: string;
  unitLetter: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  created: Date;
};

export class InitializeNewUnitStudentNotFound extends Error { }
export class InitializeNewUnitStudentArrears extends Error { }
export class InitializeNewUnitEnrollmentNotFound extends Error { }
export class InitializeNewUnitEnrollmentOnHold extends Error { }
export class InitializeNewUnitNotReady extends Error { }
export class InitializeNewUnitAlreadyInitialized extends Error { }
export class InitializeNewUnitNotFound extends Error { }

export class InitializeNewUnitInteractor implements IInteractor<InitializeNewUnitRequestDTO, InitializeNewUnitResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ studentId, enrollmentId, unitLetter }: InitializeNewUnitRequestDTO): Promise<ResultType<InitializeNewUnitResponseDTO>> {
    try {
      // check the student and course
      const student = await this.prisma.student.findUnique({
        where: { studentId },
        include: { enrollments: { where: { enrollmentId } } },
      });

      if (!student) {
        return Result.fail(new InitializeNewUnitStudentNotFound());
      }

      if (student.arrears) {
        return Result.fail(new InitializeNewUnitStudentArrears());
      }

      if (!student.enrollments.length) {
        return Result.fail(new InitializeNewUnitEnrollmentNotFound());
      }

      if (!student.enrollments[0].onHold) {
        return Result.fail(new InitializeNewUnitEnrollmentOnHold());
      }

      // check the existing units
      const units = await this.prisma.newUnit.findMany({ where: { enrollmentId } });

      if (units.some(u => !u.skipped && (u.submitted === null || u.marked === null))) {
        return Result.fail(new InitializeNewUnitNotReady());
      }

      if (units.some(u => u.unitLetter === unitLetter)) {
        return Result.fail(new InitializeNewUnitAlreadyInitialized());
      }

      const courseId = student.enrollments[0].courseId;

      // find the unit template and all its children
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { courseId, unitLetter },
        include: {
          assignments: {
            include: {
              parts: {
                include: {
                  textBoxes: true,
                  uploadSlots: true,
                  mediaElements: true,
                },
              },
              mediaElements: true,
            },
          },
        },
      });

      if (!unitTemplate) {
        return Result.fail(new InitializeNewUnitNotFound());
      }

      const newUnit = await this.prisma.newUnit.create({
        data: {
          unitId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
          enrollmentId,
          unitLetter: unitTemplate.unitLetter,
          title: unitTemplate.title,
          description: unitTemplate.description,
          optional: unitTemplate.optional,
          assignments: {
            create: unitTemplate.assignments.map(assignment => ({
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
                      optional: textBox.optional,
                      order: textBox.order,
                    })),
                  },
                  uploadSlots: {
                    create: part.uploadSlots.map(uploadSlot => ({
                      uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      label: uploadSlot.label,
                      allowedTypes: uploadSlot.allowedTypes,
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
        unitId: this.uuidService.binToUUID(newUnit.unitId),
        unitLetter: newUnit.unitLetter,
        title: newUnit.title,
        description: newUnit.description,
        optional: newUnit.optional,
        complete: newUnit.complete,
        created: newUnit.created,
      });

    } catch (err) {
      this.logger.error('error initializing new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
