import express from 'express';

import { environmentConfigService } from '../../services/index.js';
import { BaseMiddleware } from '../baseMiddleware.js';

export class LessonsStaticFilesMiddleware extends BaseMiddleware<void, void> {
  public static readonly path = environmentConfigService.config.paths.materials.content;

  protected async validate(): Promise<void | false> {
    /* empty */
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async executeImpl(): Promise<void> {
    console.log(`Looking for file at ${LessonsStaticFilesMiddleware.path}`);
    express.static(LessonsStaticFilesMiddleware.path)(this.req, this.res, this.next);
  }
}
