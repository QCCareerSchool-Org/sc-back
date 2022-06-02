export type MaterialType = 'lesson' | 'video' | 'download' | 'assignment';

export type NewMaterialDTO = {
  /** uuid string */
  materialId: string;
  courseId: number;
  type: MaterialType;
  title: string;
  description: string;
  unitLetter: string;
  order: number;
  filename: string | null;
  mimeTypeId: string | null;
  externalData: string | null;
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
    default:
      throw Error('invalid material type');
  }
};
