import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncWrapper = (fn: AsyncRequestHandler): RequestHandler => (req, res, next) => {
  fn(req, res, next).catch(next);
};
