export type NewUploadSlotAllowedType = 'image' | 'pdf' | 'word' | 'excel';

export type NewUploadSlotTemplateDTO = {
  /** uuid */
  uploadSlotTemplateId: string;
  /** uuid */
  partTemplateId: string;
  label: string;
  allowedTypes: NewUploadSlotAllowedType[];
  points: number;
  optional: boolean;
  order: number;
  created: Date;
  modified: Date | null;
};
