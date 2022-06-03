import { BaseController } from './baseController.js';

export class NotFoundController extends BaseController<void, void> {

  protected async validate(): Promise<void> { /* */ }

  protected async executeImpl(): Promise<void> {
    this.notFound();
  }
}
