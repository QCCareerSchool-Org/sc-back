export type NewMediumType = 'image' | 'video' | 'audio' | 'download';

export type NewAssignmentMediumDTO = {
  /** uuid */
  assignmentMediumId: string;
  /** uuid */
  assignmentTemplateId: string | null;
  mimeTypeId: string;
  type: NewMediumType;
  filename: string;
  caption: string;
  externalData: string | null;
  order: number;
  created: Date;
  modified: Date | null;
};
