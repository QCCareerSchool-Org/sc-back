import type { NewDescriptionType } from './newDescriptionType.js';

export type NewPartTemplateDTO = {
  /** uuid */
  partTemplateId: string;
  /** uuid */
  assignmentTemplateId: string;
  partNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  /** should always be null for students */
  markingCriteria: string | null;
  created: Date;
  modified: Date | null;
};
