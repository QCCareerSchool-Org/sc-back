import browser from 'browser-detect';
import type { BrowserDetectInfo } from 'browser-detect/dist/types/browser-detect.interface.js';
import type { RequestHandler } from 'express';

type BrowserDetect = (userAgent?: string) => BrowserDetectInfo;

const b = browser as unknown as BrowserDetect; // Typescript 4.9 seems to require this

/**
 * Middleware that determines the browser and OS and stores the data in res.locals.browser
 *
 * @param req express request
 * @param res express response
 * @param next express next function
 */
export const browserDetectMiddleware: RequestHandler = (req, res, next) => {
  res.locals.browser = b(req.headers['user-agent']);
  next();
};
