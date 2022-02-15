import type { NextFunction, Request, Response } from 'express';
import { BaseController } from './baseController';

export abstract class BaseMiddleware<RequestDTO, ResponseDTO> extends BaseController<RequestDTO, ResponseDTO> {

  protected next: NextFunction;

  public constructor(req: Request, res: Response, next: NextFunction) {
    super(req, res);
    this.next = next;
  }
}
