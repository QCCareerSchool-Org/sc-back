import type { NewMediumType } from './newAssignmentMediumDTO.js';

export type NewPartMediumDTO = {
  /** uuid */
  partMediumId: string;
  /** uuid */
  partTemplateId: string | null;
  mimeTypeId: string;
  type: NewMediumType;
  filename: string;
  filesize: number;
  caption: string;
  externalData: string | null;
  order: number;
  created: Date;
  modified: Date | null;
};
