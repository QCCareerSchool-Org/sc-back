type Part = { mark: number; override: number | null };
type Assignment = { parts: Part[] };
type Submission = { assignments: Assignment[] };

type PartDTO = { mark: number; override: number | null };
type AssignmentDTO = { parts: PartDTO[]; mark: number; override: number | null };
type SubmissionDTO = { assignments: AssignmentDTO[]; mark: number; override: number | null };

const GetSubmissionDTO1 = (submission: Submission): SubmissionDTO => {
  let submissionMark = 0;
  let submissionOverride: number | null = null;

  return {
    assignments: submission.assignments.map(a => {
      let assignmentMark = 0;
      let assignmentOverride: number | null = null;
      const assignmentDTO: AssignmentDTO = {
        parts: a.parts.map(p => {
          const partDTO: PartDTO = {
            mark: p.mark,
            override: p.override,
          };
          assignmentMark += p.mark;
          if (p.override !== null) {
            assignmentOverride = (assignmentOverride ?? 0) + p.override;
          }
          return partDTO;
        }),
        mark: assignmentMark,
        override: assignmentOverride,
      };
      submissionMark += assignmentMark;
      if (assignmentOverride !== null) {
        submissionOverride = (submissionOverride ?? 0) + (assignmentOverride as number); // typescript bug?
      }
      return assignmentDTO;
    }),
    mark: submissionMark,
    override: submissionOverride,
  };
};

const GetSubmissionDTO2 = (submission: Submission): SubmissionDTO => {
  let submissionMark = 0;
  let submissionOverride = 0;
  let submissionOverridden = false;

  return {
    assignments: submission.assignments.map(a => {
      let assignmentMark = 0;
      let assignmentOverride = 0;
      let assignmentOverridden = false;
      const assignmentDTO: AssignmentDTO = {
        parts: a.parts.map(p => {
          const partDTO: PartDTO = {
            mark: p.mark,
            override: p.override,
          };
          assignmentMark += p.mark;
          if (p.override !== null) {
            assignmentOverridden = true;
            assignmentOverride += p.override;
          }
          return partDTO;
        }),
        mark: assignmentMark,
        override: assignmentOverridden ? assignmentOverride : null,
      };
      submissionMark += assignmentMark;
      if (assignmentOverridden) {
        submissionOverridden = true;
        submissionOverride += submissionOverride + assignmentOverride;
      }
      return assignmentDTO;
    }),
    mark: submissionMark,
    override: submissionOverridden ? submissionOverride : null,
  };
};
