import type { NewAssignment, NewAssignmentsOnNewAssignmentMedia, NewPart, NewPartsOnNewPartMedia, NewSubmission, NewSubmissionPrice, NewTextBox, NewUploadSlot, PrismaClient } from '@prisma/client';

import { failure, success } from 'generic-result-type';
import type { Result as ResultType } from 'generic-result-type';
import type { NewSubmissionDTO } from '../../domain/administrators/newSubmissionDTO.js';
import type { IConfigService } from '../../services/config/index.js';
import type { IDateService } from '../../services/date/index.js';
import type { IFileService } from '../../services/file/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';

export type RestartNewSubmissionRequestDTO = {
  submissionId: string;
};

export type RestartNewSubmissionResponseDTO = NewSubmissionDTO;

export abstract class RestartNewSubmissionErorr extends Error { }
export class RestartNewSubmissionNotFound extends RestartNewSubmissionErorr { }
export class RestartNewSubmissionAlreadyRestarted extends RestartNewSubmissionErorr { }
export class RestartNewSubmissionStudentExpired extends RestartNewSubmissionErorr { }
export class RestartNewSubmissionStudentInArrears extends RestartNewSubmissionErorr { }
export class RestartNewSubmissionEnrollmentDueDatePassed extends RestartNewSubmissionErorr { }
export class RestartNewSubmissionEnrollmentOnHold extends RestartNewSubmissionErorr { }

type NewSubmissionWithChildren = NewSubmission & {
  newAssignments: Array<NewAssignment & {
    newAssignmentMedia: NewAssignmentsOnNewAssignmentMedia[];
    newParts: Array<NewPart & {
      newTextBoxes: NewTextBox[];
      newUploadSlots: NewUploadSlot[];
      newPartMedia: NewPartsOnNewPartMedia[];
    }>;
  }>;
  prices: NewSubmissionPrice[];
  parent: NewSubmission | null;
};

type PrismaTransaction = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export class RestartNewSubmissionInteractor implements IInteractor<RestartNewSubmissionRequestDTO, RestartNewSubmissionResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly fileService: IFileService,
    private readonly dateService: IDateService,
    private readonly configService: IConfigService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute(request: RestartNewSubmissionRequestDTO): Promise<ResultType<RestartNewSubmissionResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(request.submissionId);

      try {
        const submission = await this.prisma.$transaction(async transaction => {
          const originalSubmission = await transaction.newSubmission.findFirst({
            where: { submissionId: submissionIdBin },
            include: {
              newAssignments: {
                include: {
                  newAssignmentMedia: { include: { newAssignmentMedium: true } },
                  newParts: { include: { newPartMedia: { include: { newPartMedium: true } }, newTextBoxes: true, newUploadSlots: true } },
                },
              },
              enrollment: { include: { student: true } },
              prices: true,
              parent: true,
            },
          });

          if (!originalSubmission) {
            throw new RestartNewSubmissionNotFound();
          }

          if (originalSubmission.redoId !== null) {
            throw new RestartNewSubmissionAlreadyRestarted();
          }

          const enrollment = originalSubmission.enrollment;
          const student = enrollment.student;

          if (student.expiry && this.dateService.fixPrismaReadDate(student.expiry) <= this.dateService.getDate()) {
            throw new RestartNewSubmissionStudentExpired();
          }

          if (student.arrears) {
            throw new RestartNewSubmissionStudentInArrears();
          }

          if (enrollment.dueDate && this.dateService.fixPrismaReadDate(enrollment.dueDate) <= this.dateService.getDate()) {
            throw new RestartNewSubmissionEnrollmentDueDatePassed();
          }

          if (enrollment.onHold) {
            throw new RestartNewSubmissionEnrollmentOnHold();
          }

          const restartedSubmission = await this.duplicateData(transaction, originalSubmission);

          await transaction.newSubmission.update({
            data: { redoId: restartedSubmission.submissionId },
            where: { submissionId: submissionIdBin },
          });

          await this.duplicateFiles(originalSubmission, restartedSubmission);

          return restartedSubmission;
        }, { maxWait: 20_000, timeout: 50_000 });

        let submissionComplete = true;
        let submissionMarked = true;
        let submissionPoints = 0;
        let submissionMark = 0;
        let submissionMarkOverride = 0;
        let submissionOverridden = false;

        for (const assignment of submission.newAssignments) {
          let assignmentComplete = true;
          let assignmentMarked = true;
          let assignmentPoints = 0;
          let assignmentMark = 0;
          let assignmentMarkOverride = 0;
          let assignmentOverridden = false;

          for (const part of assignment.newParts) {
            let partComplete = true;
            let partMarked = true;
            let partPoints = 0;
            let partMark = 0;
            let partMarkOverride = 0;
            let partOverridden = false;

            for (const textBox of part.newTextBoxes) {
              const textBoxComplete = textBox.text.length > 0;
              if (!textBox.optional && !textBoxComplete) {
                partComplete = false;
              }
              if (textBoxComplete && textBox.mark === null && textBox.points > 0) {
                partMarked = false;
              }
              // ignore incomplete, optional inputs
              if (textBoxComplete || !textBox.optional) {
                partPoints += textBox.points;
                partMark += textBox.mark ?? 0;
                if (textBox.markOverride !== null) {
                  partOverridden = true;
                }
                partMarkOverride += textBox.markOverride ?? textBox.mark ?? 0;
              }
            }

            for (const uploadSlot of part.newUploadSlots) {
              const uploadSlotComplete = uploadSlot.filename !== null;
              if (!uploadSlot.optional && !uploadSlotComplete) {
                partComplete = false;
              }
              if (uploadSlotComplete && uploadSlot.mark === null && uploadSlot.points > 0) {
                partMarked = false;
              }
              // ignore incomplete, optional inputs
              if (uploadSlotComplete || !uploadSlot.optional) {
                partPoints += uploadSlot.points;
                partMark += uploadSlot.mark ?? 0;
                if (uploadSlot.markOverride !== null) {
                  partOverridden = true;
                }
                partMarkOverride += uploadSlot.markOverride ?? uploadSlot.mark ?? 0;
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
            if (partOverridden) {
              assignmentOverridden = true;
            }
            assignmentMarkOverride += partMarkOverride;
          }

          if (!assignment.optional && !assignmentComplete) {
            submissionComplete = false;
          }
          // ignore incomplete, optional assignments
          if (assignmentComplete || !assignment.optional) {
            submissionPoints += assignmentPoints;
            submissionMark += assignmentMark;
            if (assignmentOverridden) {
              submissionOverridden = true;
            }
            submissionMarkOverride += assignmentMarkOverride;
          }
          if (assignmentComplete && !assignmentMarked) {
            submissionMarked = false;
          }
        }

        return success({
          submissionId: this.uuidService.binToUUID(submission.submissionId),
          enrollmentId: submission.enrollmentId,
          tutorId: submission.tutorId,
          unitLetter: submission.unitLetter,
          title: submission.title,
          description: submission.description,
          markingCriteria: submission.markingCriteria,
          optional: submission.optional,
          order: submission.order,
          tutorComment: submission.tutorComment,
          adminComment: submission.adminComment,
          submitted: submission.submitted,
          transferred: submission.transferred,
          closed: submission.closed,
          skipped: submission.skipped,
          responseFilename: submission.responseFilename,
          responseFilesize: submission.responseFilesize,
          responseMimeTypeId: submission.responseMimeTypeId,
          responseProgress: submission.responseProgress,
          redoId: submission.redoId === null ? null : this.uuidService.binToUUID(submission.redoId),
          hasParent: submission.parent !== null,
          complete: submissionComplete,
          points: submissionPoints,
          mark: submission.closed && submissionMarked ? submissionMark : null,
          markOverride: submission.closed && submissionMarked && submissionOverridden ? submissionMarkOverride : null,
          created: this.dateService.fixPrismaReadDate(submission.created),
          modified: this.dateService.fixPrismaReadDate(submission.modified),
        });

      } catch (err) {
        if (err instanceof RestartNewSubmissionErorr) {
          return failure(err);
        }
        throw err;
      }

    } catch (err) {
      this.logger.error('error restarting new submission', err instanceof Error ? err.message : err);
      return failure(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async duplicateData(transaction: PrismaTransaction, originalSubmission: NewSubmissionWithChildren): Promise<NewSubmissionWithChildren> {
    const restartedSubmissionIdBin = this.uuidService.uuidToBin(this.uuidService.createUUID());
    const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

    return transaction.newSubmission.create({
      data: {
        submissionId: restartedSubmissionIdBin,
        enrollmentId: originalSubmission.enrollmentId,
        tutorId: originalSubmission.tutorId,
        unitLetter: originalSubmission.unitLetter,
        title: originalSubmission.title,
        description: originalSubmission.description,
        markingCriteria: originalSubmission.markingCriteria,
        optional: originalSubmission.optional,
        order: originalSubmission.order,
        created: prismaNow,
        modified: prismaNow,
        newAssignments: {
          create: originalSubmission.newAssignments.map(a => ({
            assignmentId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            assignmentNumber: a.assignmentNumber,
            title: a.title,
            description: a.description,
            descriptionType: a.descriptionType,
            markingCriteria: a.markingCriteria,
            optional: a.optional,
            created: prismaNow,
            modified: prismaNow,
            newAssignmentMedia: {
              createMany: {
                data: a.newAssignmentMedia.map(m => ({
                  assignmentMediumId: m.assignmentMediumId,
                  order: m.order,
                })),
              },
            },
            newParts: {
              create: a.newParts.map(p => ({
                partId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                partNumber: p.partNumber,
                title: p.title,
                description: p.description,
                descriptionType: p.descriptionType,
                markingCriteria: p.markingCriteria,
                markingComments: p.markingComments,
                created: prismaNow,
                modified: prismaNow,
                newTextBoxes: {
                  create: p.newTextBoxes.map(t => ({
                    textBoxId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                    description: t.description,
                    lines: t.lines,
                    optional: t.optional,
                    order: t.order,
                    text: t.text,
                    points: t.points,
                    mark: t.mark,
                    markOverride: null,
                    notes: t.notes,
                    created: prismaNow,
                    modified: prismaNow,
                  })),
                },
                newUploadSlots: {
                  create: p.newUploadSlots.map(u => ({
                    uploadSlotId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
                    label: u.label,
                    allowedTypes: u.allowedTypes,
                    optional: u.optional,
                    order: u.order,
                    filename: u.filename,
                    filesize: u.filesize,
                    mimeTypeId: u.mimeTypeId,
                    points: u.points,
                    mark: u.mark,
                    markOverride: null,
                    notes: u.notes,
                    compressed: u.compressed,
                    created: prismaNow,
                    modified: prismaNow,
                  })),
                },
                newPartMedia: {
                  create: p.newPartMedia.map(m => ({
                    partMediumId: m.partMediumId,
                    order: m.order,
                  })),
                },
              })),
            },
          })),
        },
        prices: {
          create: originalSubmission.prices.map(p => ({
            submissionPriceId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            countryId: p.countryId,
            price: p.price,
            currencyId: p.currencyId,
            selected: p.selected,
            created: prismaNow,
            modified: prismaNow,
          })),
        },
      },
      include: {
        newAssignments: {
          include: {
            newAssignmentMedia: { include: { newAssignmentMedium: true } },
            newParts: { include: { newPartMedia: { include: { newPartMedium: true } }, newTextBoxes: true, newUploadSlots: true } },
          },
        },
        prices: true,
        parent: true,
      },
    });
  }

  private async duplicateFiles(originalSubmission: NewSubmissionWithChildren, restartedSubmission: NewSubmissionWithChildren): Promise<void> {
    // we're assuming that the restarted submission has the same number of assignments, parts, and upload slots, and in the same order
    for (let aIndex = 0; aIndex < originalSubmission.newAssignments.length; aIndex++) {
      for (let pIndex = 0; pIndex < originalSubmission.newAssignments[aIndex].newParts.length; pIndex++) {
        for (let uIndex = 0; uIndex < originalSubmission.newAssignments[aIndex].newParts[pIndex].newUploadSlots.length; uIndex++) {
          const originalUploadSlot = originalSubmission.newAssignments[aIndex].newParts[pIndex].newUploadSlots[uIndex];
          if (originalUploadSlot.filename !== null) {
            const restartedUploadSlot = restartedSubmission.newAssignments[aIndex].newParts[pIndex].newUploadSlots[uIndex];
            await this.copyUploadSlot(originalSubmission.enrollmentId, originalUploadSlot.uploadSlotId, restartedUploadSlot.uploadSlotId);
          }
        }
      }
    }
  }

  private async copyUploadSlot(enrollmentId: number, originalIdBin: Buffer, restartedIdBin: Buffer): Promise<void> {
    const paddedEnrollmentId = enrollmentId.toString().padStart(8, '0');
    const path = `${this.configService.config.paths.assignmentsPath}/${paddedEnrollmentId.substring(0, 4)}/${paddedEnrollmentId.substring(4, 8)}`;

    const originalFilePath = `${path}/${this.uuidService.binToUUID(originalIdBin)}`;
    const restartedFilePath = `${path}/${this.uuidService.binToUUID(restartedIdBin)}`;

    await this.fileService.copy(originalFilePath, restartedFilePath);
  }
}
