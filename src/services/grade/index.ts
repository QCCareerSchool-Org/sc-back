export type GradeScheme = 'old' | '2014';

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'F';

export interface IGradeService {
  calculate: (percentage: number, scheme?: GradeScheme) => Grade;
}
