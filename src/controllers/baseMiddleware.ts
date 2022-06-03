import type { NextFunction, Request, Response } from 'express';

import { BaseController } from './baseController.js';

export abstract class BaseMiddleware<RequestDTO = unknown, ResponseDTO = unknown> extends BaseController<RequestDTO, ResponseDTO> {

  public constructor(req: Readonly<Request>, res: Readonly<Response>, protected readonly next: NextFunction) {
    super(req, res);
  }
}
