export type MaterialType = 'lesson' | 'video' | 'download' | 'assignment' | 'scorm2004';

export type MaterialDTO = {
  /** uuid string */
  materialId: string;
  /** uuid string */
  unitId: string;
  type: MaterialType;
  title: string;
  description: string;
  order: number;
  filename: string | null;
  contentMimeTypeId: string | null;
  imageMimeTypeId: string | null;
  externalData: string | null;
  entryPoint: string | null;
  minutes: number | null;
  chapters: number | null;
  videos: number | null;
  knowledgeChecks: number | null;
  created: Date;
  modified: Date | null;
};

export const materialType = (raw: string): MaterialType => {
  switch (raw) {
    case 'lesson':
      return 'lesson';
    case 'video':
      return 'video';
    case 'download':
      return 'download';
    case 'assignment':
      return 'assignment';
    case 'scorm2004':
      return 'scorm2004';
    default:
      throw Error('invalid material type');
  }
};
