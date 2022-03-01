export type NewUploadSlotDTO = {
  /** uuid */
  uploadSlotId: string;
  /** uuid */
  partId: string;
  label: string;
  allowedTypes: string[];
  optional: boolean;
  order: number;
  filename: string | null;
  size: number | null;
  mimeTypeId: string | null;
  complete: boolean;
};
