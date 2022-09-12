import type { NewAssignment, NewPart, NewSubmission, NewTextBox, NewUploadSlot } from '@prisma/client';

type SubmissionWithChildren = NewSubmission & {
  newAssignments: Array<NewAssignment & {
    newParts: Array<NewPart & {
      newTextBoxes: NewTextBox[];
      newUploadSlots: NewUploadSlot[];
    }>;
  }>;
};

export const submissionIsComplete = (submission: SubmissionWithChildren): boolean => {
  return submission.newAssignments.filter(a => !a.optional).every(a => {
    return a.newParts.every(p => {
      return p.newTextBoxes.filter(t => !t.optional).every(t => t.text.length > 0)
        && p.newUploadSlots.filter(u => !u.optional).every(u => u.filename !== null);
    });
  });
};
