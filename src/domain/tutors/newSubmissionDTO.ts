export type NewSubmissionDTO = {
  /** uuid */
  submissionId: string;
  enrollmentId: number;
  tutorId: number | null;
  unitLetter: string;
  title: string | null;
  description: string | null;
  /** should always be null for students */
  markingCriteria: string | null;
  optional: boolean;
  order: number;
  /** should always be null for students */
  tutorComment: string | null;
  adminComment: string | null;
  submitted: Date | null;
  transferred: Date | null;
  closed: Date | null;
  skipped: boolean;
  responseFilename: string | null;
  responseFilesize: number | null;
  responseMimeTypeId: string | null;
  responseProgress: number | null;
  /** uuid */
  redoId: string | null;
  hasParent: boolean;
  complete: boolean;
  points: number;
  mark: number | null;
  created: Date;
  modified: Date | null;
};
