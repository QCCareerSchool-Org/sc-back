import type { PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type DeleteNewTextBoxTemplateRequestDTO = {
  textBoxId: string;
};

export type DeleteNewTextBoxTemplateResponseDTO = void;

export class DeleteNewTextBoxTemplateNotFound extends Error { }
export class DeleteNewTextBoxTemplateSubmissionsEnabled extends Error { }

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
          newPartTemplate: { include: { newAssignmentTemplate: { include: { newSubmissionTemplate: { include: { course: true } } } } } },
        },
      });
      if (!textBoxTemplate) {
        return failure(new DeleteNewTextBoxTemplateNotFound());
      }

      if (textBoxTemplate.newPartTemplate.newAssignmentTemplate.newSubmissionTemplate.course.submissionsEnabled) {
        return failure(new DeleteNewTextBoxTemplateSubmissionsEnabled());
      }

      // delete the text box template
      await this.prisma.newTextBoxTemplate.delete({ where: { textBoxTemplateId: textBoxIdBin } });

      return success(undefined);

    } catch (err) {
      this.logger.error('error deleting text box template', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
