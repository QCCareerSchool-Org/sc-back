export type NewUnitDTO = {
  /** uuid */
  unitId: string;
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
  skipped: Date | null;
  transferred: Date | null;
  marked: Date | null;
  responseFilename: string | null;
  responseFilesize: number | null;
  responseMimeTypeId: string | null;
  complete: boolean;
  points: number;
  mark: number | null;
  created: Date;
  modified: Date | null;
};
