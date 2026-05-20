import type { PrismaClient } from '@prisma/client';

import type { Result as ResultType } from 'generic-result-type';
import { failure, success } from 'generic-result-type';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type SaveNewNoteRequestDTO = {
  tutorId: number;
  studentId: number;
  note: string | null;
};

export type SaveNewNoteResponseDTO = {
  studentId: number;
  note: string | null;
};

abstract class SaveNewNoteError extends Error {
  public constructor(message?: string) {
    super(message);
    this.name = new.target.name;
  }
}
export class SaveNewNoteTooLong extends SaveNewNoteError { }

export class SaveNewNoteInteractor implements IInteractor<SaveNewNoteRequestDTO, SaveNewNoteResponseDTO> {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: SaveNewNoteRequestDTO): Promise<ResultType<SaveNewNoteResponseDTO>> {
    try {
      const { studentId, note } = request;

      if (note !== null) {
        const max = 16_777_215;
        const length = [ ...note ].length;
        if (length > max) {
          throw new SaveNewNoteTooLong();
        }
      }

      if (note === null || note.trim().length === 0) {
        await this.prisma.note.deleteMany({ where: { studentId } });
        return success({ studentId, note: null });
      }

      const noteIdBin = this.uuidService.uuidToBin(this.uuidService.createUUID());

      const saved = await this.prisma.note.upsert({
        where: { studentId },
        update: { note },
        create: { noteId: noteIdBin, studentId, note },
      });

      return success({
        studentId: saved.studentId,
        note: saved.note,
      });
    } catch (err) {
      this.logger.error('error saving note', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

}
