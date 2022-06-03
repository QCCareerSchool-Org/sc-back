import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

import { environmentConfigService } from '../../services/index.js';

const log: Prisma.LogLevel[] = environmentConfigService.config.environment === 'development'
  ? [ 'warn', 'error' ]
  : [];

export const prisma = new PrismaClient({ log });

// set the session to UTC time zone to avoid Prisma timezone bug https://github.com/prisma/prisma/issues/5051
prisma.$use(async (params, next) => {
  const timezoneSql = 'set time_zone = \'+00:00\'';
  if (hasQuery(params.args)) {
    if (params.args.query !== timezoneSql) {
      await prisma.$queryRaw`set time_zone = '+00:00'`;
    }
  }
  // Manipulate params here
  const result = next(params);
  // See results here
  return result;
});

const hasQuery = (args: Prisma.MiddlewareParams['args']): args is { query: any } => {
  return typeof args === 'object' && args !== null && 'query' in args;
};
