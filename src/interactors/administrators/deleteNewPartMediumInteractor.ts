import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type DeleteNewPartMediumRequestDTO = {
  schoolId: number;
  courseId: number;
  unitId: string;
  assignmentId: string;
  partId: string;
  mediumId: string;
};

export type DeleteNewPartMediumResponseDTO = void;

export class DeleteNewPartMediumNotFound extends Error { }
export class DeleteNewPartMediumUnitsEnabled extends Error { }
export class DeleteNewPartMediumUnlinkError extends Error { }

export class DeleteNewPartMediumInteractor implements IInteractor<DeleteNewPartMediumRequestDTO, DeleteNewPartMediumResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: DeleteNewPartMediumRequestDTO): Promise<ResultType<DeleteNewPartMediumResponseDTO>> {
    try {
      const { schoolId, courseId } = request;
      const unitIdBin = this.uuidService.uuidToBin(request.unitId);
      const assignmentIdBin = this.uuidService.uuidToBin(request.assignmentId);
      const partIdBin = this.uuidService.uuidToBin(request.partId);
      const mediumIdBin = this.uuidService.uuidToBin(request.mediumId);

      // find the assignment medium
      const partMedium = await this.prisma.newPartMedium.findFirst({
        where: { partMediumId: mediumIdBin, newPartTemplate: { partTemplateId: partIdBin, newAssignmentTemplate: { assignmentTemplateId: assignmentIdBin, newUnitTemplate: { unitTemplateId: unitIdBin, course: { courseId, schoolId } } } } },
        include: {
          newParts: true,
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!partMedium) {
        return Result.fail(new DeleteNewPartMediumNotFound());
      }

      if (partMedium.newPartTemplate?.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewPartMediumUnitsEnabled());
      }

      if (partMedium.newParts.length > 0) {
        // there are linked parts
        // update the medium to remove the relation to the part template
        await this.prisma.newPartMedium.update({
          data: { partTemplateId: null },
          where: { partMediumId: mediumIdBin },
        });
      } else {
        // no assignments are using this medium
        // delete the medium
        if (partMedium.externalData === null) {
          const filePath = `${this.configService.config.paths.partMediaPath}/${request.mediumId}`;
          await this.prisma.$transaction(async transaction => {
            await transaction.newPartMedium.delete({
              where: { partMediumId: mediumIdBin },
            });
            try {
              await this.fileService.unlink(filePath);
            } catch (err) {
              this.logger.error('Could not delete file', err);
              throw new DeleteNewPartMediumUnlinkError();
            }
          });
        } else {
          await this.prisma.newAssignmentMedium.delete({
            where: { assignmentMediumId: mediumIdBin },
          });
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting part medium', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
