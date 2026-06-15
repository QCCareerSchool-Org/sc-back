import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IInteractor } from '../index.js';

export type SaveAdminNoteRequestDTO = {
  administratorId: number;
  studentId: number;
  note: string | null;
};

export type SaveAdminNoteResponseDTO = void;

abstract class SaveAdminNoteError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveAdminNoteTooLong extends SaveAdminNoteError { }

export class SaveAdminNoteInteractor implements IInteractor<SaveAdminNoteRequestDTO, SaveAdminNoteResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveAdminNoteRequestDTO): Promise<ResultType<SaveAdminNoteResponseDTO>> {
    try {
      const { studentId, note } = request;

      if (note !== null) {
        const max = 16_777_215;
        const length = [ ...note ].length;
        if (length > max) {
          throw new SaveAdminNoteTooLong();
        }
      }

      if (note === null || note.trim().length === 0) {
        await this.prisma.adminNote.deleteMany({ where: { studentId } });
        return success();
      }

      await this.prisma.adminNote.upsert({
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
