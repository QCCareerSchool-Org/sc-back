export type NewTextBoxTemplateDTO = {
  /** uuid */
  textBoxId: string;
  /** uuid */
  partId: string;
  description: string | null;
  lines: number | null;
  points: number;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
