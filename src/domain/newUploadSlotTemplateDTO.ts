export type NewUploadSlotAllowedType = 'image' | 'pdf' | 'word' | 'excel';

export type NewUploadSlotTemplateDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: NewUploadSlotAllowedType[];
  points: number;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
