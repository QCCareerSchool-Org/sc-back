import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { CourseDTO } from '../../domain/courseDTO';
import type { NewAssignmentTemplateDTO } from '../../domain/newAssignmentTemplateDTO';
import type { NewUnitTemplateDTO } from '../../domain/newUnitTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type GetNewUnitTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
};

export type GetNewUnitTemplateResponseDTO = NewUnitTemplateDTO & {
  course: CourseDTO;
  newAssignmentTemplates: NewAssignmentTemplateDTO[];
};

export class GetNewUnitTemplateNotFound extends Error { }

export class GetNewUnitTemplateInteractor implements IInteractor<GetNewUnitTemplateRequestDTO, GetNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId }: GetNewUnitTemplateRequestDTO): Promise<ResultType<GetNewUnitTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      const unit = await this.prisma.newUnitTemplate.findFirst({
        where: { unitId: unitIdBin, course: { courseId, schoolId } },
        include: {
          course: true,
          newAssignments: {
            orderBy: [ { assignmentNumber: 'asc' } ],
          },
        },
      });
      if (!unit) {
        return Result.fail(new GetNewUnitTemplateNotFound());
      }

      return Result.success({
        unitId: this.uuidService.binToUUID(unit.unitId),
        courseId: unit.courseId,
        unitLetter: unit.unitLetter,
        title: unit.title,
        description: unit.description,
        optional: unit.optional,
        created: unit.created,
        modified: unit.modified,
        course: {
          courseId: unit.course.courseId,
          schoolId: unit.course.schoolId,
          code: unit.course.code,
          version: unit.course.version,
          studentTypeId: unit.course.studentTypeId,
          name: unit.course.name,
          courseGuide: unit.course.courseGuide,
          quizzesEnabled: unit.course.quizzesEnabled,
          noTutor: unit.course.noTutor,
          unitType: unit.course.unitType,
          enabled: unit.course.enabled,
          order: unit.course.order,
          entityVersion: unit.course.entityVersion,
        },
        newAssignmentTemplates: unit.newAssignments.map(a => ({
          assignmentId: this.uuidService.binToUUID(a.assignmentId),
          unitId: this.uuidService.binToUUID(a.unitId),
          assignmentNumber: a.assignmentNumber,
          title: a.title,
          description: a.description,
          optional: a.optional,
          created: a.created,
          modified: a.modified,
        })),
      });

    } catch (err) {
      this.logger.error('error getting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
