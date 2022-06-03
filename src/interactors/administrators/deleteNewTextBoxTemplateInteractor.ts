import type { PrismaClient } from '@prisma/client';

import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type DeleteNewTextBoxTemplateRequestDTO = {
  textBoxId: string;
};

export type DeleteNewTextBoxTemplateResponseDTO = void;

export class DeleteNewTextBoxTemplateNotFound extends Error { }
export class DeleteNewTextBoxTemplateUnitsEnabled extends Error { }

export class DeleteNewTextBoxTemplateInteractor implements IInteractor<DeleteNewTextBoxTemplateRequestDTO, DeleteNewTextBoxTemplateResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ textBoxId }: DeleteNewTextBoxTemplateRequestDTO): Promise<ResultType<DeleteNewTextBoxTemplateResponseDTO>> {
    try {
      const textBoxIdBin = this.uuidService.uuidToBin(textBoxId);

      // find the text box template
      const textBoxTemplate = await this.prisma.newTextBoxTemplate.findFirst({
        where: { textBoxTemplateId: textBoxIdBin },
        include: {
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newUnitTemplate: { include: { course: true } } } } } },
        },
      });
      if (!textBoxTemplate) {
        return Result.fail(new DeleteNewTextBoxTemplateNotFound());
      }

      if (textBoxTemplate.newPartTemplate.newAssignmentTemplate.newUnitTemplate.course.newUnitsEnabled) {
        return Result.fail(new DeleteNewTextBoxTemplateUnitsEnabled());
      }

      // delete the text box template
      await this.prisma.newTextBoxTemplate.delete({ where: { textBoxTemplateId: textBoxIdBin } });

      return Result.success(undefined);

    } catch (err) {
      this.logger.error('error deleting text box template', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
