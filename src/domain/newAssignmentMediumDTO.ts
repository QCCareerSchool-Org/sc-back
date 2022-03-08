export type NewMediumType = 'image' | 'video' | 'audio';

export type NewAssignmentMediumDTO = {
  /** uuid */
  assignmentMediumId: string;
  /** uuid */
  assignmentTemplateId: string | null;
  mimeTypeId: string;
  type: NewMediumType;
  caption: string | null;
  externalData: string | null;
  order: number;
  created: Date;
  modified: Date | null;
};
