import type { NewUploadSlotAllowedType } from '../newUploadSlotTemplateDTO.js';

/** Student version doesn't have markOverride */
export type NewUploadSlotDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: NewUploadSlotAllowedType[];
  points: number;
  mark: number | null;
  notes: string | null;
  optional: boolean;
  order: number;
  filename: string | null;
  filesize: number | null;
  mimeTypeId: string | null;
  complete: boolean;
  created: Date;
  modified: Date | null;
};
