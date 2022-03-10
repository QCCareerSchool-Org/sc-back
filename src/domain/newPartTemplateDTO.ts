import type { NewDescriptionType } from './newDescriptionType';

export type NewPartTemplateDTO = {
  /** uuid */
  partTemplateId: string;
  /** uuid */
  assignmentTemplateId: string;
  partNumber: number;
  title: string | null;
  description: string | null;
  descriptionType: NewDescriptionType;
  created: Date;
  modified: Date | null;
};
