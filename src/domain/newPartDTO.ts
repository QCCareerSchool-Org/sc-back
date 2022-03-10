import type { NewDescriptionType } from './newDescriptionType';

export type NewPartDTO = {
  /** uuid */
  partId: string;
  /** uuid */
  assignmentId: string;
  partNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  complete: boolean;
  created: Date;
  modified: Date | null;
};
