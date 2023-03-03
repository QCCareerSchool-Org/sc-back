import type { NewDescriptionType } from '../newDescriptionType.js';

export type NewAssignmentDTO = {
  /** uuid */
  assignmentId: string;
  /** uuid */
  submissionId: string;
  assignmentNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  /** should always be null for students */
  markingCriteria: string | null;
  optional: boolean;
  complete: boolean;
  points: number;
  mark: number | null;
  markOverride: number | null;
  created: Date;
  modified: Date | null;
};
