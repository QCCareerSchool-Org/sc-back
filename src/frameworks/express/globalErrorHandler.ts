import type { ErrorRequestHandler } from 'express';

import { winstonLoggerService } from '../../services';

const INTERNAL_SERVER_ERROR_CODE = 500;

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const message = err instanceof Error
    ? err.message
    : typeof err === 'string' ? err : JSON.stringify(err);
  winstonLoggerService.error(message);
  if (!res.headersSent) {
    res.status(INTERNAL_SERVER_ERROR_CODE).send(message);
  } else {
    next(err);
  }
};
