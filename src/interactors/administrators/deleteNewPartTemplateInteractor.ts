import type { PrismaClient } from '@prisma/client';

import type { IInteractor } from '..';
import type { IConfigService } from '../../services/config';
import type { IFileService } from '../../services/file';
import type { ILoggerService } from '../../services/logger';
import type { IUUIDService } from '../../services/uuid';
import { Result } from '../result';
import type { ResultType } from '../result';

export type DeleteNewPartTemplateRequestDTO = {
  partId: string;
};

export type DeleteNewPartTemplateResponseDTO = void;

export class DeleteNewPartTemplateNotFound extends Error { }
export class DeleteNewPartTemplateUnitsEnabled extends Error { }

export class DeleteNewPartTemplateInteractor implements IInteractor<DeleteNewPartTemplateRequestDTO, DeleteNewPartTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ partId }: DeleteNewPartTemplateRequestDTO): Promise<ResultType<DeleteNewPartTemplateResponseDTO>> {
    try {
      const partIdBin = this.uuidService.uuidToBin(partId);

      // find the part template
      const partTemplate = await this.prisma.newPartTemplate.findFirst({
        where: { partTemplateId: partIdBin },
        include: {
          newPartMedia: { include: { newParts: true } },
          newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } },
        },
      });
      if (!partTemplate) {
        return Result.fail(new DeleteNewPartTemplateNotFound());
      }

      if (partTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewPartTemplateUnitsEnabled());
      }

      // delete the part template
      await this.prisma.newPartTemplate.delete({ where: { partTemplateId: partIdBin } });

      // delete any part media that's not currently linked to any parts
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

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting part template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
