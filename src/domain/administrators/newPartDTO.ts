import type { NewDescriptionType } from '../newDescriptionType.js';

export type NewPartDTO = {
  /** uuid */
  partId: string;
  /** uuid */
  assignmentId: string;
  partNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  /** should always be null for students */
  markingCriteria: string | null;
  /** should always be null for students */
  markingComments: string | null;
  complete: boolean;
  points: number;
  mark: number | null;
  markOverride: number | null;
  created: Date;
  modified: Date | null;
};
