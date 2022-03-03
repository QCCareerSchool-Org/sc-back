export type NewUploadSlotTemplateDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: string[];
  points: number;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
