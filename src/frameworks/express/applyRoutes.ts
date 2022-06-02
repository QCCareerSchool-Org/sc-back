import type { NextFunction, Request, RequestHandler, Response, Router } from 'express';
import type { BaseController } from '../../controllers/baseController';
import type { BaseMiddleware } from '../../controllers/baseMiddleware';
import { asyncWrapper } from './asyncWrapper';

type Controller = { new (req: Readonly<Request>, res: Readonly<Response>): Readonly<BaseController> };
type Middleware = { new (req: Readonly<Request>, res: Readonly<Response>, next: NextFunction): Readonly<BaseMiddleware> };

export type Route = readonly [
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' | 'use',
  path: string,
  handler: Controller | Middleware,
  ...middleware: readonly RequestHandler[],
];

export const applyRoutes = (router: Readonly<Router>, routes: readonly Route[]): void => {
  for (const [ method, path, handler, ...middleware ] of routes) {
    router[method](path, ...middleware, asyncWrapper(async (req, res, next) => new handler(req, res, next).execute()));
  }
};
