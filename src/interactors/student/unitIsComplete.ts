import { NewAssignment, NewPart, NewTextBox, NewUnit, NewUploadSlot } from '@prisma/client';

type UnitWithChildren = NewUnit & {
  newAssignments: Array<NewAssignment & {
    newParts: Array<NewPart & {
      newTextBoxes: NewTextBox[];
      newUploadSlots: NewUploadSlot[];
    }>;
  }>;
};

export const unitIsComplete = (unit: UnitWithChildren): boolean => {
  return unit.newAssignments.filter(a => !a.optional).every(a => {
    return a.newParts.filter(p => !p.optional).every(p => {
      return p.newTextBoxes.filter(t => !t.optional).every(t => t.text.length > 0)
        && p.newUploadSlots.filter(u => !u.optional).every(u => u.filename !== null);
    });
  });
};
