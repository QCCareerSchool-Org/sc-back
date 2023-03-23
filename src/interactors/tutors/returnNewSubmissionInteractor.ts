import type { NewAssignment, NewPart, NewSubmission, NewTextBox, NewUploadSlot, PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/tutors/newSubmissionDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';

export type ReturnNewSubmissionRequestDTO = {
  tutorId: number;
  studentId: number;
  submissionId: string;
  comment: string;
};

export type ReturnNewSubmissionResponseDTO = NewSubmissionDTO;

abstract class ReturnNewSubmissionError extends Error { }
export class ReturnNewSubmissionNotFound extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionNotSubmitted extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionSkipped extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionAlreadyClosed extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionWrongTutor extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionAlreadyReturned extends ReturnNewSubmissionError { }
export class ReturnNewSubmissionCommentEmpty extends ReturnNewSubmissionError { }

export class ReturnNewSubmissionInteractor implements IInteractor<ReturnNewSubmissionRequestDTO, ReturnNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ tutorId, studentId, submissionId, comment }: ReturnNewSubmissionRequestDTO): Promise<ResultType<ReturnNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      let updatedSubmission: NewSubmission & {
        newAssignments: (NewAssignment & {
          newParts: (NewPart & {
            newTextBoxes: NewTextBox[];
            newUploadSlots: NewUploadSlot[];
          })[];
        })[];
      };

      try {
        updatedSubmission = await this.prisma.$transaction(async transaction => {
          const newSubmission = await transaction.newSubmission.findFirst({
            where: { submissionId: submissionIdBin, enrollment: { studentId } },
            include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
          });

          if (!newSubmission) {
            throw new ReturnNewSubmissionNotFound();
          }

          if (!newSubmission.submitted) {
            throw new ReturnNewSubmissionNotSubmitted();
          }

          if (newSubmission.skipped) {
            throw new ReturnNewSubmissionSkipped();
          }

          if (newSubmission.closed) {
            throw new ReturnNewSubmissionAlreadyClosed();
          }

          if (newSubmission.tutorId !== tutorId) {
            throw new ReturnNewSubmissionWrongTutor();
          }

          if (newSubmission.tutorComment) {
            throw new ReturnNewSubmissionAlreadyReturned();
          }

          if (comment.length === 0) {
            throw new ReturnNewSubmissionCommentEmpty();
          }

          const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

          return transaction.newSubmission.update({
            data: {
              tutorComment: comment,
              modified: prismaNow,
              returns: {
                create: {
                  submissionReturnId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                  returned: prismaNow,
                },
              },
            },
            where: { submissionId: submissionIdBin },
            include: { newAssignments: { include: { newParts: { include: { newTextBoxes: true, newUploadSlots: true } } } } },
          });
        });
      } catch (err) {
        if (err instanceof ReturnNewSubmissionError) {
          return Result.fail(err);
        }
        throw err;
      }

      let submissionComplete = true;
      let submissionMarked = true;
      let submissionPoints = 0;
      let submissionMark = 0;

      for (const a of updatedSubmission.newAssignments) {
        let assignmentComplete = true;
        let assignmentMarked = true;
        let assignmentPoints = 0;
        let assignmentMark = 0;
        for (const p of a.newParts) {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          for (const t of p.newTextBoxes) {
            const textBoxComplete = t.text.length > 0;
            if (!textBoxComplete && !t.optional) {
              partComplete = false;
            }
            if (textBoxComplete && t.mark === null && t.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (textBoxComplete || !t.optional) {
              partPoints += t.points;
              partMark += t.mark ?? 0;
            }
          }
          for (const u of p.newUploadSlots) {
            const uploadSlotComplete = u.filename !== null;
            if (!uploadSlotComplete && !u.optional) {
              partComplete = false;
            }
            if (uploadSlotComplete && u.mark === null && u.points > 0) {
              partMarked = false;
            }
            // ignore incomplete, optional inputs
            if (uploadSlotComplete || !u.optional) {
              partPoints += u.points;
              partMark += u.mark ?? 0;
            }
          }
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
        }
        if (!assignmentComplete && !a.optional) {
          submissionComplete = false;
        }
        if (assignmentComplete && !assignmentMarked) {
          submissionMarked = false;
        }
        // ignore incomplete, optional assignments
        if (assignmentComplete || !a.optional) {
          submissionPoints += assignmentPoints;
          submissionMark += assignmentMark;
        }
      }

      return Result.success({
        submissionId: this.uuidService.binToUUID(updatedSubmission.submissionId),
        enrollmentId: updatedSubmission.enrollmentId,
        tutorId: updatedSubmission.tutorId,
        unitLetter: updatedSubmission.unitLetter,
        title: updatedSubmission.title,
        description: updatedSubmission.description,
        markingCriteria: updatedSubmission.markingCriteria,
        optional: updatedSubmission.optional,
        order: updatedSubmission.order,
        tutorComment: updatedSubmission.tutorComment,
        adminComment: updatedSubmission.adminComment,
        submitted: this.dateService.fixPrismaReadDate(updatedSubmission.submitted),
        transferred: this.dateService.fixPrismaReadDate(updatedSubmission.transferred),
        closed: this.dateService.fixPrismaReadDate(updatedSubmission.closed),
        skipped: updatedSubmission.skipped,
        responseFilename: updatedSubmission.responseFilename,
        responseFilesize: updatedSubmission.responseFilesize,
        responseMimeTypeId: updatedSubmission.responseMimeTypeId,
        created: this.dateService.fixPrismaReadDate(updatedSubmission.created),
        modified: this.dateService.fixPrismaReadDate(updatedSubmission.modified),
        complete: submissionComplete,
        points: submissionPoints,
        mark: submissionMarked ? submissionMark : null,
      });

    } catch (err) {
      this.logger.error('error returning new submission', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
