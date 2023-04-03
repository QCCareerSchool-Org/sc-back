import type { PrismaClient } from '@prisma/client';

import type { NewSubmissionDTO } from '../../domain/administrators/newSubmissionDTO.js';
import type { NewTransferDTO } from '../../domain/newTransfer.js';
import type { TutorDTO } from '../../domain/tutorDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { IEmailService } from '../../services/email/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { IInteractor } from '../index.js';
import { Result } from '../result.js';
import type { ResultType } from '../result.js';

export type InsertNewTransferRequestDTO = {
  administratorId: number;
  submissionId: string;
  tutorId: number;
};

export type InsertNewTransferResponseDTO = NewTransferDTO & {
  preTutor: TutorDTO;
  postTutor: TutorDTO;
  newSubmission: Omit<NewSubmissionDTO, 'points' | 'mark' | 'markOverride' | 'complete'>;
};

export class InsertNewTransferSubmissionNotFound extends Error { }
export class InsertNewTransferSubmissionAlreadyClosed extends Error { }
export class InsertNewTransferNoTutorAssigned extends Error { }
export class InsertNewTransferInvalidTutor extends Error { }

export class InsertNewTransferInteractor implements IInteractor<InsertNewTransferRequestDTO, InsertNewTransferResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    private readonly emailService: IEmailService,
    private readonly dateService: IDateService,
    private readonly logger: ILoggerService,
  ) { /* empty */ }

  public async execute({ administratorId, submissionId, tutorId }: InsertNewTransferRequestDTO): Promise<ResultType<InsertNewTransferResponseDTO>> {
    try {
      const submissionIdBin = this.uuidService.uuidToBin(submissionId);

      const prismaNow = this.dateService.fixPrismaWriteDate(this.dateService.getDate());

      const transfer = await this.prisma.$transaction(async t => {
        // find the submission
        const submission = await this.prisma.newSubmission.findFirst({
          where: { submissionId: submissionIdBin },
          include: { enrollment: { include: { course: true } } },
        });
        if (!submission) {
          throw new InsertNewTransferSubmissionNotFound();
        }

        if (!submission.tutorId) {
          throw new InsertNewTransferNoTutorAssigned();
        }

        if (submission.closed) {
          throw new InsertNewTransferSubmissionAlreadyClosed();
        }

        const tutor = await t.tutor.findFirst({
          where: { tutorId, schoolId: submission.enrollment.course.schoolId },
        });
        if (!tutor) {
          throw new InsertNewTransferInvalidTutor();
        }

        await t.newSubmission.update({
          data: { tutorId, transferred: prismaNow, modified: prismaNow },
          where: { submissionId: submissionIdBin },
        });

        return t.newTransfer.create({
          data: {
            transferId: this.uuidService.uuidToBin(this.uuidService.createUUID()),
            submissionId: submission.submissionId,
            administratorId,
            preTutorId: submission.tutorId,
            postTutorId: tutorId,
            created: prismaNow,
          },
          include: {
            newSubmission: { include: { enrollment: { include: { course: true } } } },
            preTutor: true,
            postTutor: true,
          },
        });
      });

      if (transfer.postTutor.emailAddress) {
        try {
          await this.emailTutor(
            transfer.postTutor.emailAddress,
            transfer.postTutor.firstName,
            transfer.postTutor.lastName,
            this.uuidService.binToUUID(transfer.submissionId),
            transfer.newSubmission.enrollment.studentId,
            transfer.newSubmission.enrollment.courseId,
            transfer.newSubmission.enrollment.course.code,
            transfer.newSubmission.enrollment.studentNumber,
            transfer.newSubmission.unitLetter,
          );
        } catch (err) {
          this.logger.error('Could not send transfer email', err);
        }
      }

      return Result.success({
        transferId: this.uuidService.binToUUID(transfer.transferId),
        submissionId: this.uuidService.binToUUID(transfer.submissionId),
        administratorId: transfer.administratorId,
        preTutorId: transfer.preTutorId,
        postTutorId: transfer.postTutorId,
        created: this.dateService.fixPrismaReadDate(transfer.created),
        preTutor: {
          tutorId: transfer.preTutor.tutorId,
          firstName: transfer.preTutor.firstName,
          lastName: transfer.preTutor.lastName,
          introduction: false,
        },
        postTutor: {
          tutorId: transfer.postTutor.tutorId,
          firstName: transfer.postTutor.firstName,
          lastName: transfer.postTutor.lastName,
          introduction: false,
        },
        newSubmission: {
          submissionId: this.uuidService.binToUUID(transfer.newSubmission.submissionId),
          enrollmentId: transfer.newSubmission.enrollmentId,
          tutorId: transfer.newSubmission.tutorId,
          unitLetter: transfer.newSubmission.unitLetter,
          title: transfer.newSubmission.title,
          description: transfer.newSubmission.description,
          markingCriteria: transfer.newSubmission.markingCriteria,
          optional: transfer.newSubmission.optional,
          order: transfer.newSubmission.order,
          tutorComment: transfer.newSubmission.tutorComment,
          adminComment: transfer.newSubmission.adminComment,
          submitted: this.dateService.fixPrismaReadDate(transfer.newSubmission.submitted),
          transferred: this.dateService.fixPrismaReadDate(transfer.newSubmission.transferred),
          closed: this.dateService.fixPrismaReadDate(transfer.newSubmission.closed),
          skipped: transfer.newSubmission.skipped,
          responseFilename: transfer.newSubmission.responseFilename,
          responseFilesize: transfer.newSubmission.responseFilesize,
          responseMimeTypeId: transfer.newSubmission.responseMimeTypeId,
          created: this.dateService.fixPrismaReadDate(transfer.newSubmission.created),
          modified: this.dateService.fixPrismaReadDate(transfer.newSubmission.modified),
        },
      });

    } catch (err) {
      this.logger.error('error inserting new transfer', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }

  private async emailTutor(emailAddress: string, firstName: string, lastName: string, submissionId: string, studentId: number, courseId: number, courseCode: string, studentNumber: number, unitLetter: string): Promise<void> {
    const url = `https://studentcenter.qccareerschool.com/sc/tutors/students/${studentId}/courses/${courseId}/submissions/${encodeURIComponent(submissionId)}`;

    const htmlBody = `<p>Dear ${firstName},</p>
<p>You have a <a href="${url}">new unit ready for marking</a>.</p>
<p>Student: ${courseCode}${studentNumber}<br />Unit: ${unitLetter}</p>`;

    const textBody = `Dear ${firstName},

You have a new unit ready for marking (${url}).

Student: ${courseCode}${studentNumber}
Unit: ${unitLetter}`;

    const name = firstName + ' ' + lastName;
    await this.emailService.send(name, emailAddress, 'Unit Ready for Marking', htmlBody, textBody);
  }
}
