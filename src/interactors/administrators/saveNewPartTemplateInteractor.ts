import type { NewPartTemplate, PrismaClient } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';

import type { IInteractor } from '..';
import type { NewPartTemplateDTO } from '../../domain/newPartTemplateDTO';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result, ResultType } from '../result';

export type SaveNewPartTemplateRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  data: {
    partNumber: number;
    title: string;
    description: string | null;
    optional: boolean;
  };
};

export type SaveNewPartTemplateResponseDTO = NewPartTemplateDTO;

export class SaveNewPartTemplateNotFound extends Error { }
export class SaveNewPartTemplatePartNumberAlreadyInUse extends Error { }

export class SaveNewPartTemplateInteractor implements IInteractor<SaveNewPartTemplateRequestDTO, SaveNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ schoolId, courseId, unitId, assignmentId, partId, data }: SaveNewPartTemplateRequestDTO): Promise<ResultType<SaveNewPartTemplateResponseDTO>> {
    try {
      const { partNumber, title, description, optional } = data;
      const unitIdBin = this.uuidService.uuidToBin(unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(assignmentId);
      const partIdBin = this.uuidService.uuidToBin(partId);

      // find the part
      const part = await this.prisma.newPartTemplate.findFirst({
        where: { partId: partIdBin, newAssignment: { assignmentId: assignmentIdBin, newUnit: { unitId: unitIdBin, course: { courseId, schoolId } } } },
      });
      if (!part) {
        return Result.fail(new SaveNewPartTemplateNotFound());
      }

      // validate the data

      // update the part
      let updatedPart: NewPartTemplate;
      try {
        updatedPart = await this.prisma.newPartTemplate.update({
          data: { partNumber, title, description, optional },
          where: { partId: partIdBin },
        });
      } catch (err) {
        if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002' && err.meta) {
          const meta = err.meta as { target: string };
          if (meta.target === 'assignment_template_id_part_number') {
            return Result.fail(new SaveNewPartTemplatePartNumberAlreadyInUse());
          }
        }
        throw err;
      }

      return Result.success({
        partId: this.uuidService.binToUUID(updatedPart.partId),
        assignmentId: this.uuidService.binToUUID(updatedPart.assignmentId),
        partNumber: updatedPart.partNumber,
        title: updatedPart.title,
        description: updatedPart.description,
        optional: updatedPart.optional,
        created: updatedPart.created,
        modified: updatedPart.modified,
      });

    } catch (err) {
      this.logger.error('error saving part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
