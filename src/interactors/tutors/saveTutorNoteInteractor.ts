import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type SaveTutorNoteRequestDTO = {
  tutorId: number;
  studentId: number;
  note: string | null;
};

export type SaveTutorNoteResponseDTO = void;

abstract class SaveTutorNoteError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveTutorNoteTooLong extends SaveTutorNoteError { }

export class SaveTutorNoteInteractor implements IInteractor<SaveTutorNoteRequestDTO, SaveTutorNoteResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveTutorNoteRequestDTO): Promise<ResultType<SaveTutorNoteResponseDTO>> {
    try {
      const { studentId, note } = request;

      if (note !== null) {
        const max = 16_777_215;
        const length = [ ...note ].length;
        if (length > max) {
          throw new SaveTutorNoteTooLong();
        }
      }

      if (note === null || note.trim().length === 0) {
        await this.prisma.tutorNote.deleteMany({ where: { studentId } });
        return success();
      }

      await this.prisma.tutorNote.upsert({
        where: { studentId },
        update: { note },
        create: { studentId, note },
      });

      return success();
    } catch (err) {
      this.logger.error('error saving note', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
