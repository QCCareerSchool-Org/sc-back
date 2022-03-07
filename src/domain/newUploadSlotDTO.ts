import type { NewUploadSlotAllowedType } from './newUploadSlotTemplateDTO';

export type NewUploadSlotDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: NewUploadSlotAllowedType[];
  points: number;
  mark: number | null;
  optional: boolean;
  order: number;
  filename: string | null;
  size: number | null;
  mimeTypeId: string | null;
  complete: boolean;
  created: Date;
  modified: Date | null;
};
