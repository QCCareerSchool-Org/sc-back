import type { Enrollment, Student } from '@prisma/client';

import type { IDateService } from '../../services/date/index.js';
import type { IInteractor } from '../index.js';
import type { ResultType } from '../result.js';

type EnrollmentWithStudent = Enrollment & { student: Student };

abstract class StudentError extends Error {}
export class StudentNotFound extends StudentError {}
export class StudentExpired extends StudentError {}
export class StudentInArrears extends StudentError {}
export class EnrollmentNotFound extends StudentError {}
export class EnrollmentDueDatePassed extends StudentError {}
export class EnrollmentOnHold extends StudentError {}

/** provides helper methods to detect if accounts are expired, on hold, etc. */
export abstract class StudentInteractor<RequestDTO, ResponseDTO> implements IInteractor<RequestDTO, ResponseDTO> {

  public constructor(protected readonly dateService: IDateService) { /* empty */ }

  public checkStudent(student: Student | null): void {
    if (!student) {
      throw new StudentNotFound();
    }

    if (student.expiry && this.dateService.fixPrismaReadDate(student.expiry) <= this.dateService.getDate()) {
      throw new StudentExpired();
    }

    if (student.arrears) {
      throw new StudentInArrears();
    }
  }

  public checkEnrollment(enrollment: EnrollmentWithStudent | null): void {
    if (!enrollment) {
      throw new EnrollmentNotFound();
    }

    this.checkStudent(enrollment.student);

    if (enrollment.dueDate && this.dateService.fixPrismaReadDate(enrollment.dueDate) <= this.dateService.getDate()) {
      throw new EnrollmentDueDatePassed();
    }
    if (enrollment.onHold) {
      throw new EnrollmentOnHold();
    }
  }

  public abstract execute(args: RequestDTO): ResultType<ResponseDTO> | Promise<ResultType<ResponseDTO>>;
}
