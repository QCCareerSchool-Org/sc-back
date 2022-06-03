import dotenv from 'dotenv';
import type { RequestHandler } from 'express';
import type { CityResponse } from 'maxmind';
import maxmind from 'maxmind';

import { winstonLoggerService } from '../../services/index.js';
import { asyncWrapper } from './asyncWrapper.js';

dotenv.config();

const mmdbLocation = process.env.MMDB_LOCATION;
if (!mmdbLocation) {
  throw Error('Environment variable MMDB_LOCATION is not defined');
}

export const locationMiddleware: RequestHandler = asyncWrapper(async (req, res, next) => {
  let address: string | undefined;
  const forwardedFor = req.headers['x-forwarded-for'];
  if (Array.isArray(forwardedFor) && forwardedFor.length) {
    address = forwardedFor[0].split(',')[0].trim();
  } else if (typeof forwardedFor === 'string') {
    address = forwardedFor.split(',')[0].trim();
  } else {
    address = req.socket.remoteAddress;
  }
  if (process.env.MODE === 'test') {
    address = '135.23.119.183';
  }
  if (address) {
    try {
      const lookup = await maxmind.open<CityResponse>(mmdbLocation);
      res.locals.location = lookup.get(address);
    } catch (err) {
      if (err instanceof Error) {
        winstonLoggerService.error(err.message);
      } else {
        winstonLoggerService.error('Unknown error in location middleware');
      }
      res.locals.location = null;
    }
  }
  next();
});
