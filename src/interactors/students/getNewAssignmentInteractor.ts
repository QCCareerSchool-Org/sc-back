import type { PrismaClient } from '@prisma/client';

import type { NewAssignmentMediumDTO } from '../../domain/newAssignmentMediumDTO.js';
import type { NewPartMediumDTO } from '../../domain/newPartMediumDTO.js';
import type { NewUploadSlotAllowedType } from '../../domain/newUploadSlotTemplateDTO.js';
import type { NewAssignmentDTO } from '../../domain/students/newAssignmentDTO.js';
import type { NewPartDTO } from '../../domain/students/newPartDTO.js';
import type { NewSubmissionDTO } from '../../domain/students/newSubmissionDTO.js';
import type { NewTextBoxDTO } from '../../domain/students/newTextBoxDTO.js';
import type { NewUploadSlotDTO } from '../../domain/students/newUploadSlotDTO.js';
import type { IDateService } from '../../services/date/index.js';
import type { ILoggerService } from '../../services/logger/index.js';
import type { IUUIDService } from '../../services/uuid/index.js';
import type { ResultType } from '../result.js';
import { Result } from '../result.js';
import { StudentInteractor } from './studentInteractor.js';

export type GetNewAssignmentRequestDTO = {
  studentId: number;
  courseId: number;
  submissionId: string;
  assignmentId: string;
};

export type GetNewAssignmentResponseDTO = NewAssignmentDTO & {
  newSubmission: Omit<NewSubmissionDTO, 'complete' | 'points' | 'mark'>;
  newAssignmentMedia: NewAssignmentMediumDTO[];
  newParts: Array<NewPartDTO & {
    newTextBoxes: NewTextBoxDTO[];
    newUploadSlots: NewUploadSlotDTO[];
    newPartMedia: NewPartMediumDTO[];
  }>;
};

export class GetNewAssignmentNotFound extends Error { }

/**
 * Should consider mark overrides.
 */
export class GetNewAssignmentInteractor extends StudentInteractor<GetNewAssignmentRequestDTO, GetNewAssignmentResponseDTO> {

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly uuidService: IUUIDService,
    dateService: IDateService,
    private readonly logger: ILoggerService,
  ) {
    super(dateService);
  }

  public async execute({ studentId, courseId, submissionId, assignmentId }: GetNewAssignmentRequestDTO): Promise<ResultType<GetNewAssignmentResponseDTO>> {
    try {
      const assignment = await this.prisma.newAssignment.findFirst({
        where: {
          assignmentId: this.uuidService.uuidToBin(assignmentId),
          submissionId: this.uuidService.uuidToBin(submissionId),
          newSubmission: { enrollment: { studentId, courseId } },
        },
        include: {
          newSubmission: { include: { enrollment: { include: { course: true } } } },
          newAssignmentMedia: { include: { newAssignmentMedium: true }, orderBy: [ { order: 'asc' } ] },
          newParts: {
            orderBy: [ { partNumber: 'asc' } ],
            include: {
              newTextBoxes: { orderBy: [ { order: 'asc' } ] },
              newUploadSlots: { orderBy: [ { order: 'asc' } ] },
              newPartMedia: { include: { newPartMedium: true }, orderBy: [ { order: 'asc' } ] },
            },
          },
        },
      });

      if (!assignment) {
        return Result.fail(new GetNewAssignmentNotFound());
      }

      let assignmentComplete = true;
      let assignmentMarked = true;
      let assignmentPoints = 0;
      let assignmentMark = 0;

      return Result.success({
        assignmentId: this.uuidService.binToUUID(assignment.assignmentId),
        submissionId: this.uuidService.binToUUID(assignment.submissionId),
        assignmentNumber: assignment.assignmentNumber,
        title: assignment.title,
        description: assignment.description,
        descriptionType: assignment.descriptionType,
        markingCriteria: null, // students should never see the marking criteria
        optional: assignment.optional,
        created: this.dateService.fixPrismaReadDate(assignment.created),
        modified: this.dateService.fixPrismaReadDate(assignment.modified),
        newSubmission: {
          submissionId: this.uuidService.binToUUID(assignment.newSubmission.submissionId),
          enrollmentId: assignment.newSubmission.enrollmentId,
          tutorId: assignment.newSubmission.tutorId,
          unitLetter: assignment.newSubmission.unitLetter,
          title: assignment.newSubmission.title,
          description: assignment.newSubmission.description,
          markingCriteria: null, // students should never see the marking criteria
          optional: assignment.newSubmission.optional,
          order: assignment.newSubmission.order,
          tutorComment: null, // students should never see the tutor comment
          adminComment: assignment.newSubmission.adminComment,
          submitted: this.dateService.fixPrismaReadDate(assignment.newSubmission.submitted),
          transferred: this.dateService.fixPrismaReadDate(assignment.newSubmission.transferred),
          closed: this.dateService.fixPrismaReadDate(assignment.newSubmission.closed),
          skipped: assignment.newSubmission.skipped,
          responseFilename: assignment.newSubmission.responseFilename === null ? null : `${assignment.newSubmission.enrollment.course.code}${assignment.newSubmission.enrollment.enrollmentId} Submission ${assignment.newSubmission.unitLetter}.mp3`,
          responseFilesize: assignment.newSubmission.responseFilesize,
          responseMimeTypeId: assignment.newSubmission.responseMimeTypeId,
          responseProgress: assignment.newSubmission.responseProgress,
          created: this.dateService.fixPrismaReadDate(assignment.newSubmission.created),
          modified: this.dateService.fixPrismaReadDate(assignment.newSubmission.modified),
        },
        newAssignmentMedia: assignment.newAssignmentMedia.map(m => ({
          assignmentMediumId: this.uuidService.binToUUID(m.newAssignmentMedium.assignmentMediumId),
          assignmentTemplateId: m.newAssignmentMedium.assignmentTemplateId === null ? null : this.uuidService.binToUUID(m.newAssignmentMedium.assignmentTemplateId),
          mimeTypeId: m.newAssignmentMedium.mimeTypeId,
          type: m.newAssignmentMedium.type,
          filename: m.newAssignmentMedium.filename,
          filesize: m.newAssignmentMedium.filesize,
          caption: m.newAssignmentMedium.caption,
          externalData: m.newAssignmentMedium.externalData,
          order: m.order, // from the join table
          created: this.dateService.fixPrismaReadDate(m.newAssignmentMedium.created),
          modified: this.dateService.fixPrismaReadDate(m.newAssignmentMedium.modified),
        })),
        newParts: assignment.newParts.map(p => {
          let partComplete = true;
          let partMarked = true;
          let partPoints = 0;
          let partMark = 0;
          const part = {
            partId: this.uuidService.binToUUID(p.partId),
            assignmentId: this.uuidService.binToUUID(p.assignmentId),
            partNumber: p.partNumber,
            title: p.title,
            description: p.description,
            descriptionType: p.descriptionType,
            markingCriteria: null,
            markingComments: null,
            created: this.dateService.fixPrismaReadDate(p.created),
            modified: this.dateService.fixPrismaReadDate(p.modified),
            newTextBoxes: p.newTextBoxes.map(t => {
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
                partMark += t.markOverride ?? t.mark ?? 0;
              }
              return {
                textBoxId: this.uuidService.binToUUID(t.textBoxId),
                partId: this.uuidService.binToUUID(t.partId),
                description: t.description,
                lines: t.lines,
                points: t.points,
                mark: assignment.newSubmission.closed ? t.markOverride ?? t.mark : null, // hide the mark unless the submission is marked
                notes: null, // students should never see the tutor's notes
                optional: t.optional,
                order: t.order,
                text: t.text,
                complete: textBoxComplete,
                created: this.dateService.fixPrismaReadDate(t.created),
                modified: this.dateService.fixPrismaReadDate(t.modified),
              };
            }),
            newUploadSlots: p.newUploadSlots.map(u => {
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
                partMark += u.markOverride ?? u.mark ?? 0;
              }
              return {
                uploadSlotId: this.uuidService.binToUUID(u.uploadSlotId),
                partId: this.uuidService.binToUUID(u.partId),
                label: u.label,
                allowedTypes: u.allowedTypes.split(',') as NewUploadSlotAllowedType[],
                points: u.points,
                mark: assignment.newSubmission.closed ? u.markOverride ?? u.mark : null,
                notes: null,
                optional: u.optional,
                order: u.order,
                filename: u.filename,
                filesize: u.filesize,
                mimeTypeId: u.mimeTypeId,
                complete: uploadSlotComplete,
                created: this.dateService.fixPrismaReadDate(u.created),
                modified: this.dateService.fixPrismaReadDate(u.modified),
              };
            }),
            newPartMedia: p.newPartMedia.map(m => ({
              partMediumId: this.uuidService.binToUUID(m.partMediumId),
              partTemplateId: m.newPartMedium.partTemplateId === null ? null : this.uuidService.binToUUID(m.newPartMedium.partTemplateId),
              mimeTypeId: m.newPartMedium.mimeTypeId,
              type: m.newPartMedium.type,
              filename: m.newPartMedium.filename,
              filesize: m.newPartMedium.filesize,
              caption: m.newPartMedium.caption,
              externalData: m.newPartMedium.externalData,
              order: m.order, // from the join table
              created: this.dateService.fixPrismaReadDate(m.newPartMedium.created),
              modified: this.dateService.fixPrismaReadDate(m.newPartMedium.modified),
            })),
            complete: partComplete,
            points: partPoints,
            mark: assignment.newSubmission.closed && partMarked ? partMark : null,
          };
          if (!partComplete) {
            assignmentComplete = false;
          }
          if (partComplete && !partMarked) {
            assignmentMarked = false;
          }
          // parts can't be optional, so we always add these
          assignmentPoints += partPoints;
          assignmentMark += partMark;
          return part;
        }),
        complete: assignmentComplete,
        points: assignmentPoints,
        mark: assignment.newSubmission.closed && assignmentMarked ? assignmentMark : null,
      });

    } catch (err) {
      this.logger.error('error getting new assignment', err instanceof Error ? err.message : err);
      return Result.fail(err instanceof Error ? err : Error('unknown error'));
    }
  }
}
