import type { NextFunction, Request, Response } from 'express';

import { EnrollmentDueDatePassed, EnrollmentNotFound, EnrollmentOnHold, StudentExpired, StudentInArrears, StudentNotFound } from '../../interactors/students/studentInteractor.js';
import { BaseController } from '../baseController.js';

export abstract class StudentController<RequestDTO = unknown, ResponseDTO = unknown> extends BaseController<RequestDTO, ResponseDTO> {

  public constructor(req: Readonly<Request>, res: Readonly<Response>) {
    super(req, res);
  }

  /**
   * Handles common student errors
   * @param error the error
   * @returns true if and only if the error was handled
   */
  protected handleCommonErrors(error: Error): boolean {
    switch (error.constructor) {
      case StudentNotFound:
        this.unauthorized('Student not found');
        return true;
      case StudentExpired:
        this.forbidden('Account is expired');
        return true;
      case StudentInArrears:
        this.forbidden('Account is in arrears');
        return true;
      case EnrollmentNotFound:
        this.unauthorized('Enrollment not found');
        return true;
      case EnrollmentDueDatePassed:
        this.forbidden('Course due date has passed');
        return true;
      case EnrollmentOnHold:
        this.forbidden('Course is on hold');
        return true;
    }

    return false;
  }
}

export abstract class StudentMiddleware<RequestDTO = unknown, ResponseDTO = unknown> extends StudentController<RequestDTO, ResponseDTO> {

  public constructor(req: Readonly<Request>, res: Readonly<Response>, protected readonly next: NextFunction) {
    super(req, res);
  }
}
