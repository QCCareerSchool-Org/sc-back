import { PrismaClient } from '@prisma/client';

import { IInteractor } from '..';
import type { ILoggerService } from '../../services/logger';
import { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type InitializeNewUnitRequestDTO = {
  studentId: number;
  courseId: number;
  unit: string;
};

export type InitializeNewUnitResponseDTO = {
  unitId: string;
  courseId: number;
  unit: string;
  title: string | null;
  description: string | null;
  optional: boolean;
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

  public async execute({ studentId, courseId, unit }: InitializeNewUnitRequestDTO): Promise<ResultType<InitializeNewUnitResponseDTO>> {
    try {
      // check the student and course
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        include: { enrollments: { where: { courseId } } },
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

      if (!student.enrollments[0].on_hold) {
        return Result.fail(new InitializeNewUnitEnrollmentOnHold());
      }

      const enrollmentId = student.enrollments[0].id;

      // check the existing units
      const units = await this.prisma.newUnit.findMany({ where: { enrollmentId, courseId } });

      if (units.some(u => !u.skipped && (u.submitted === null || u.marked === null))) {
        return Result.fail(new InitializeNewUnitNotReady());
      }

      if (units.some(u => u.unit === unit)) {
        return Result.fail(new InitializeNewUnitAlreadyInitialized());
      }

      // find the unit template and all its children
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { courseId, unit },
        include: {
          assignmentTemplates: {
            include: {
              partTemplates: {
                include: {
                  textBoxTemplates: true,
                  uploadSlotTemplates: true,
                  partMediaElementTemplates: true,
                },
              },
              assignmentMediaElementTemplates: true,
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
          courseId: unitTemplate.courseId,
          enrollmentId,
          unit: unitTemplate.unit,
          title: unitTemplate.title,
          description: unitTemplate.description,
          optional: unitTemplate.optional,
          assignments: {
            create: unitTemplate.assignmentTemplates.map(assignmentTemplate => ({
              assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
              assignment: assignmentTemplate.assignment,
              title: assignmentTemplate.title,
              description: assignmentTemplate.description,
              optional: assignmentTemplate.optional,
              parts: {
                create: assignmentTemplate.partTemplates.map(partTemplate => ({
                  partId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  part: partTemplate.part,
                  title: partTemplate.title,
                  description: partTemplate.description,
                  optional: partTemplate.optional,
                  textBoxes: {
                    create: partTemplate.textBoxTemplates.map(textBoxTemplate => ({
                      textBoxId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      description: textBoxTemplate.description,
                      lines: textBoxTemplate.lines,
                      optional: textBoxTemplate.optional,
                      order: textBoxTemplate.order,
                    })),
                  },
                  uploadSlots: {
                    create: partTemplate.uploadSlotTemplates.map(uploadSlotTemplate => ({
                      uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      label: uploadSlotTemplate.label,
                      optional: uploadSlotTemplate.optional,
                      order: uploadSlotTemplate.order,
                    })),
                  },
                  partMediaElement: {
                    create: partTemplate.partMediaElementTemplates.map(partMediaTemplate => ({
                      partMediaElementId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                      mimeTypeType: partMediaTemplate.mimeTypeType,
                      externalData: partMediaTemplate.externalData,
                    })),
                  },
                })),
              },
              assignmentMediaElement: {
                create: assignmentTemplate.assignmentMediaElementTemplates.map(assignmentMediaTemplate => ({
                  assignmentMediaElementId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  mimeTypeType: assignmentMediaTemplate.mimeTypeType,
                  externalData: assignmentMediaTemplate.externalData,
                })),
              },
            })),
          },
        },
      });

      return Result.success({
        unitId: this.uuidService.binToUUID(newUnit.unitId),
        courseId: newUnit.courseId,
        unit: newUnit.unit,
        title: newUnit.title,
        description: newUnit.description,
        optional: newUnit.optional,
        created: newUnit.created,
      });

    } catch (err) {
      this.logger.error('error initializing new unit', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
