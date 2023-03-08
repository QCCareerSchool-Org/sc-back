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
  markingCriteria: null; // students should never see this
  markingComments: null; // students should never see this
  complete: boolean;
  points: number;
  mark: number | null;
  created: Date;
  modified: Date | null;
};
