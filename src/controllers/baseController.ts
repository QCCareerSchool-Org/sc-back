import type { CookieOptions, Request, Response } from 'express';

export abstract class BaseController<RequestDTO, ResponseDTO> {

  protected req: Request;
  protected res: Response;

  public constructor(req: Request, res: Response) {
    this.req = req;
    this.res = res;
  }

  /** Outside entry point */
  public async execute(): Promise<void> {
    const dto = await this.validate();
    if (dto !== false) {
      await this.executeImpl(dto);
    }
  }

  public cache(maxAge = 300): void {
    this.res.setHeader('cache-control', `public, max-age=${maxAge}`);
  }

  // Success responses

  protected ok(value: ResponseDTO): void {
    this.res.send(value);
  }

  protected created(value: ResponseDTO): void {
    this.res.status(201).send(value);
  }

  protected noContent(): void {
    this.res.status(204).end();
  }

  // Redirect responses

  protected found(): void {
    this.res.status(302).send();
  }

  // Client error responses

  protected badRequest(message?: string): void {
    this.res.status(400).send(message ?? 'Bad Request');
  }

  protected unauthorized(message?: string): void {
    this.res.status(401).send(message ?? 'Unauthorized');
  }

  protected forbidden(message?: string): void {
    this.res.status(403).send(message ?? 'Forbidden');
  }

  protected notFound(message?: string): void {
    this.res.status(404).send(message ?? 'Not Found');
  }

  protected conflict(message?: string): void {
    this.res.status(409).send(message ?? 'Conflict');
  }

  // Server error responses

  protected internalServerError(message?: string): void {
    this.res.status(500).send(message ?? 'Internal Server Error');
  }

  // Helper functions

  protected formatHeaderDate(date: Date): string {
    const days = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
    const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
    return `${days[date.getUTCDay()]}, ${date.getUTCDate().toString().padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} GMT`;
  }

  protected sendCookie(name: string, value: string, maxAge?: number, path?: string, domain?: string, secure?: boolean, httpOnly?: boolean, sameSite?: 'strict' | 'lax' | 'none'): void {
    const options: CookieOptions = { };
    if (typeof maxAge !== 'undefined') {
      options.maxAge = maxAge;
    }
    if (typeof path !== 'undefined') {
      options.path = path;
    }
    if (typeof domain !== 'undefined') {
      options.domain = domain;
    }
    if (typeof secure !== 'undefined') {
      options.secure = secure;
    }
    if (typeof httpOnly !== 'undefined') {
      options.httpOnly = httpOnly;
    }
    if (typeof sameSite !== 'undefined') {
      options.sameSite = sameSite;
    }
    this.res.cookie(name, value, options);
  }

  /** Validates the input and returns a DTO if successful, false otherwise */
  protected abstract validate(): Promise<RequestDTO | false>;

  /** Calls the interactor and handles the response */
  protected abstract executeImpl(requestDTO: RequestDTO): Promise<void>;
}
