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

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin, course: { courseId, schoolId } },
        include: {
          course: true,
          newAssignmentTemplates: {
            orderBy: [ { assignmentNumber: 'asc' } ],
          },
        },
      });
      if (!unitTemplate) {
        return Result.fail(new GetNewUnitTemplateNotFound());
      }

      return Result.success({
        unitTemplateId: this.uuidService.binToUUID(unitTemplate.unitTemplateId),
        courseId: unitTemplate.courseId,
        unitLetter: unitTemplate.unitLetter,
        title: unitTemplate.title,
        description: unitTemplate.description,
        optional: unitTemplate.optional,
        order: unitTemplate.order,
        created: unitTemplate.created,
        modified: unitTemplate.modified,
        course: {
          courseId: unitTemplate.course.courseId,
          schoolId: unitTemplate.course.schoolId,
          code: unitTemplate.course.code,
          version: unitTemplate.course.version,
          studentTypeId: unitTemplate.course.studentTypeId,
          name: unitTemplate.course.name,
          courseGuide: unitTemplate.course.courseGuide,
          quizzesEnabled: unitTemplate.course.quizzesEnabled,
          noTutor: unitTemplate.course.noTutor,
          unitType: unitTemplate.course.unitType,
          enabled: unitTemplate.course.enabled,
          order: unitTemplate.course.order,
          entityVersion: unitTemplate.course.entityVersion,
        },
        newAssignmentTemplates: unitTemplate.newAssignmentTemplates.map(a => ({
          assignmentTemplateId: this.uuidService.binToUUID(a.assignmentTemplateId),
          unitTemplateId: this.uuidService.binToUUID(a.unitTemplateId),
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
