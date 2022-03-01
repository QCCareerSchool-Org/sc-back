export type NewTextBoxDTO = {
  /** uuid */
  textBoxId: string;
  /** uuid */
  partId: string;
  description: string | null;
  lines: number | null;
  optional: boolean;
  order: number;
  text: string;
  complete: boolean;
};
