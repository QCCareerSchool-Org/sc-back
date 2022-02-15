export type StudentTypeType = 'general' | 'event' | 'design' | 'writing';

export const isValidStudentType = (studentType: string): studentType is StudentTypeType => {
  return studentType === 'general' || studentType === 'writing' || studentType === 'design' || studentType === 'event';
};
