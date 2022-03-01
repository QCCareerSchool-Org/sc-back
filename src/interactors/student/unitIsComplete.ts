import { NewAssignment, NewPart, NewTextBox, NewUnit, NewUploadSlot } from '@prisma/client';

type UnitWithChildren = NewUnit & {
  assignments: Array<NewAssignment & {
    parts: Array<NewPart & {
      textBoxes: NewTextBox[];
      uploadSlots: NewUploadSlot[];
    }>;
  }>;
};

export const unitIsComplete = (unit: UnitWithChildren): boolean => {
  return unit.assignments.filter(a => !a.optional).every(a => {
    return a.parts.filter(p => !p.optional).every(p => {
      return p.textBoxes.filter(t => !t.optional).every(t => t.text.length > 0)
        && p.uploadSlots.filter(u => !u.optional).every(u => u.filename !== null);
    });
  });
};
