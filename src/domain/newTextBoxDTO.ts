export type NewTextBoxDTO = {
  /** uuid */
  textBoxId: string;
  /** uuid */
  partId: string;
  description: string | null;
  lines: number | null;
  points: number;
  mark: number | null;
  optional: boolean;
  order: number;
  text: string;
  complete: boolean;
  created: Date;
  modified: Date | null;
};
