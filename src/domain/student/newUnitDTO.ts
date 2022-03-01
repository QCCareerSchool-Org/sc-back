export type NewUnitDTO = {
  /** uuid */
  unitId: string;
  enrollmentId: number;
  tutorId: number | null;
  unitLetter: string;
  title: string | null;
  description: string | null;
  optional: boolean;
  complete: boolean;
  // students should never see `tutorComment`
  adminComment: string | null;
  submitted: Date | null;
  skipped: Date | null;
  transferred: Date | null;
  marked: Date | null;
  created: Date;
};
