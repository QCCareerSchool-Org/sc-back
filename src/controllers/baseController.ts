import type { CookieOptions, Request, Response } from 'express';

import type { InteractorFileStreamDownload } from '../interactors/index.js';

export type ByteRange = Readonly<{
  start: number;
  end?: number;
}>;

export abstract class BaseController<RequestDTO = unknown, ResponseDTO = unknown> {

  public constructor(
    protected readonly req: Readonly<Request>,
    protected readonly res: Readonly<Response>,
  ) { /* empty */ }

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

  /** send an HTTP 200 response */
  protected ok(value: Readonly<ResponseDTO>): void {
    this.res.send(value);
  }

  /** send an HTTP 201 response */
  protected created(value: Readonly<ResponseDTO>): void {
    this.res.status(201).send(value);
  }

  /** send an HTTP 204 response */
  protected noContent(): void {
    this.res.status(204).end();
  }

  /** send an HTTP 206 response */
  protected partialContent(value: Readonly<ResponseDTO>): void {
    this.res.status(206).send(value);
  }

  // Redirect responses

  protected found(): void {
    this.res.status(302).send();
  }

  // Client error responses

  /** send an HTTP 400 response */
  protected badRequest(message?: string): void {
    this.res.status(400).send(message ?? 'Bad Request');
  }

  /** send an HTTP 401 response */
  protected unauthorized(message?: string): void {
    this.res.status(401).send(message ?? 'Unauthorized');
  }

  /** send an HTTP 403 response */
  protected forbidden(message?: string): void {
    this.res.status(403).send(message ?? 'Forbidden');
  }

  /** send an HTTP 404 response */
  protected notFound(message?: string): void {
    this.res.status(404).send(message ?? 'Not Found');
  }

  /** send an HTTP 405 response */
  protected methodNotAllowed(message?: string): void {
    this.res.status(405).send(message ?? 'Method Not Allowed');
  }

  /** send an HTTP 409 response */
  protected conflict(message?: string): void {
    this.res.status(409).send(message ?? 'Conflict');
  }

  /** send an HTTP 416 response */
  protected rangeNotSatisfiable(message?: string): void {
    this.res.status(416).send(message ?? 'Range Not Satisfiable');
  }

  // Server error responses

  /** send an HTTP 500 response */
  protected internalServerError(message?: string): void {
    this.res.status(500).send(message ?? 'Internal Server Error');
  }

  // Helper functions
  protected isGetMethod(): boolean {
    return this.req.method === 'GET';
  }

  protected isPostMethod(): boolean {
    return this.req.method === 'POST';
  }

  protected isPutMethod(): boolean {
    return this.req.method === 'PUT';
  }

  protected isPatchMethod(): boolean {
    return this.req.method === 'PATCH';
  }

  protected isDeleteMethod(): boolean {
    return this.req.method === 'DELETE';
  }

  protected formatHeaderDate(date: Readonly<Date>): string {
    const days = [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ];
    const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
    return `${days[date.getUTCDay()]}, ${date.getUTCDate().toString().padStart(2, '0')} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()} ${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')} GMT`;
  }

  protected sendCookie(name: string, value: string, maxAge?: number, path?: string, domain?: string, secure?: boolean, httpOnly?: boolean, sameSite?: 'strict' | 'lax' | 'none'): void {
    const options: CookieOptions = {};
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

  protected sendInteractorFileStream(interactorFileStream: Readonly<InteractorFileStreamDownload>): void {
    const { stream, filename, mimeType, size, lastModified, maxAge, contentEncoding, byteRange, download } = interactorFileStream;
    stream.on('error', () => {
      this.internalServerError('stream error');
    });
    this.res.setHeader('Content-Type', mimeType);
    if (typeof contentEncoding !== 'undefined') {
      this.res.setHeader('Content-Encoding', contentEncoding);
    }
    if (download) {
      this.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    }
    this.res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    this.res.setHeader('Last-Modified', this.formatHeaderDate(lastModified));
    if (typeof byteRange !== 'undefined') {
      this.res.setHeader('Content-Range', `bytes ${byteRange.start}-${byteRange.end}/${size}`);
      this.res.setHeader('Accept-Ranges', 'bytes');
      this.res.setHeader('Content-Length', byteRange.end - byteRange.start + 1);
      this.res.status(206);
    } else {
      this.res.setHeader('Content-Length', size);
      this.res.status(200);
    }
    stream.pipe(this.res);
  }

  protected sendFile(data: Readonly<Buffer>, filename: string, mimeType: string, size: number): void {
    this.res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    this.res.setHeader('Content-Type', mimeType);
    this.res.setHeader('Content-Length', size);
    this.res.end(data, 'binary');
  }

  protected getByteRange(rangeHeader: string): ByteRange | false {
    const matches = rangeHeader.match(/^bytes=(\d+)-(\d*)$/u);
    if (matches === null) {
      return false;
    }
    const start = parseInt(matches[1], 10);
    const end = matches[2] ? parseInt(matches[1], 10) : undefined;
    if (typeof end !== 'undefined' && end < start) {
      return false;
    }
    return { start, end };
  }

  /** Validates the input and returns a DTO if successful, false otherwise */
  protected abstract validate(): Promise<RequestDTO | false>;

  /** Calls the interactor and handles the response */
  protected abstract executeImpl(requestDTO: RequestDTO): Promise<void>;
}
