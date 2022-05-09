import type { Request, RequestHandler, Response, Router } from 'express';
import type { BaseController } from '../../controllers/baseController';
import { asyncWrapper } from './asyncWrapper';

export type Route = readonly [
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  path: string,
  controller: { new (req: Readonly<Request>, res: Readonly<Response>): Readonly<BaseController> },
  ...middleware: readonly RequestHandler[],
];

export const applyRoutes = (router: Readonly<Router>, routes: readonly Route[]): void => {
  for (const [ method, path, controller, ...middleware ] of routes) {
    router[method](path, ...middleware, asyncWrapper(async (req, res) => new controller(req, res).execute()));
  }
};
