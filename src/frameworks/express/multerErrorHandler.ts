import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';

const BAD_REQUEST_ERROR_CODE = 400;

export const multerErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (!res.headersSent && err instanceof MulterError) {
    res.status(BAD_REQUEST_ERROR_CODE).send('File upload error');
  } else {
    next(err);
  }
};
