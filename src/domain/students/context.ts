import type { CountryDTO } from '../countryDTO.js';
import type { CourseDTO } from '../courseDTO.js';
import type { EnrollmentDTO } from '../enrollmentDTO.js';
import type { ProvinceDTO } from '../provinceDTO.js';
import type { SchoolDTO } from '../schoolDTO.js';
import type { TutorDTO } from '../tutorDTO.js';
import type { VariantDTO } from '../variantDTO.js';
import type { NewAssignmentDTO } from './newAssignmentDTO.js';
import type { NewSubmissionDTO } from './newSubmissionDTO.js';
import type { StudentDTO } from './studentDTO.js';

export type ContextDTO = StudentDTO & {
  country: CountryDTO;
  province: ProvinceDTO | null;
  enrollments: Array<EnrollmentDTO & {
    course: CourseDTO & {
      school: SchoolDTO;
      variant: VariantDTO | null;
    };
    tutor: TutorDTO | null;
    submissions: Array<NewSubmissionDTO & {
      assignments: NewAssignmentDTO[];
    }>;
  }>;
};
