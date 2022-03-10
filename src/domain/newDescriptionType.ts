export type NewDescriptionType = 'text' | 'html';

export const isNewDescriptionType = (input: string): input is NewDescriptionType => {
  return [ 'text', 'html' ].includes(input);
};
