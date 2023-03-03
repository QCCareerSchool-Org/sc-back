import type { NewUploadSlotAllowedType } from '../newUploadSlotTemplateDTO.js';

export type NewUploadSlotDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: NewUploadSlotAllowedType[];
  points: number;
  mark: number | null;
  markOverride: number | null;
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
