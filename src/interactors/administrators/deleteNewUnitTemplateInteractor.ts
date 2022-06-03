import type { PrismaClient } from '@prisma/client';

import type { IConfigService } from '../../services/config/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewUnitTemplateRequestDTO = {
  unitId: string;
};

export type DeleteNewUnitTemplateResponseDTO = void;

export class DeleteNewUnitTemplateNotFound extends Error { }
export class DeleteNewUnitTemplateUnitsEnabled extends Error { }

export class DeleteNewUnitTemplateInteractor implements IInteractor<DeleteNewUnitTemplateRequestDTO, DeleteNewUnitTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ unitId }: DeleteNewUnitTemplateRequestDTO): Promise<ResultType<DeleteNewUnitTemplateResponseDTO>> {
    try {
      const unitIdBin = this.uuidService.uuidToBin(unitId);

      // find the unit template
      const unitTemplate = await this.prisma.newUnitTemplate.findFirst({
        where: { unitTemplateId: unitIdBin },
        include: {
          newAssignmentTemplates: { include: {
            newAssignmentMedia: { include: { newAssignments: true } },
            newPartTemplates: { include: { newPartMedia: { include: { newParts: true } } } },
          } },
          course: true,
        },
      });
      if (!unitTemplate) {
        return Result.fail(new DeleteNewUnitTemplateNotFound());
      }

      if (unitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewUnitTemplateUnitsEnabled());
      }

      // delete the unit template
      await this.prisma.newUnitTemplate.delete({ where: { unitTemplateId: unitIdBin } });

      // delete any assignment medium that's not currently linked to any assignments
      for (const assignmentTemplate of unitTemplate.newAssignmentTemplates) {
        for (const assignmentMedium of assignmentTemplate.newAssignmentMedia) {
          if (assignmentMedium.newAssignments.length === 0) {
            if (assignmentMedium.externalData === null) {
              const filePath = `${this.configService.config.paths.assignmentMediaPath}/${this.uuidService.binToUUID(assignmentMedium.assignmentMediumId)}`;
              try {
                await this.prisma.$transaction(async transaction => {
                  await transaction.newAssignmentMedium.delete({
                    where: { assignmentMediumId: assignmentMedium.assignmentMediumId },
                  });
                  await this.fileService.unlink(filePath);
                });
              } catch (err) {
                this.logger.error(`Could not unlink file ${filePath}`);
                // swallow the error and continue
                // we might be left with orphaned files, but that's acceptable
              }
            } else {
              await this.prisma.newAssignmentMedium.delete({
                where: { assignmentMediumId: assignmentMedium.assignmentMediumId },
              });
            }
          }
        }
        // delete any part medium that's not currently linked to any parts
        for (const partTemplate of assignmentTemplate.newPartTemplates) {
          for (const partMedium of partTemplate.newPartMedia) {
            if (partMedium.newParts.length === 0) {
              if (partMedium.externalData === null) {
                const filePath = `${this.configService.config.paths.partMediaPath}/${this.uuidService.binToUUID(partMedium.partMediumId)}`;
                try {
                  await this.prisma.$transaction(async transaction => {
                    await transaction.newPartMedium.delete({
                      where: { partMediumId: partMedium.partMediumId },
                    });
                    await this.fileService.unlink(filePath);
                  });
                } catch (err) {
                  this.logger.error(`Could not unlink file ${filePath}`);
                  // swallow the error and continue
                  // we might be left with orphaned files, but that's acceptable
                }
              } else {
                await this.prisma.newPartMedium.delete({
                  where: { partMediumId: partMedium.partMediumId },
                });
              }
            }
          }
        }
      }

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting unit template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
