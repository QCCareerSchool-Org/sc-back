export type NewTextBoxTemplateDTO = {
  /** uuid */
  textBoxTemplateId: string;
  /** uuid */
  partTemplateId: string;
  description: string | null;
  lines: number | null;
  points: number;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
