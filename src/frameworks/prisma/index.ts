import { Prisma, PrismaClient } from '@prisma/client';
import { environmentConfigService } from '../../services';

const log: Prisma.LogLevel[] = environmentConfigService.config.environment === 'development'
  ? [ 'query', 'info', 'warn', 'error' ]
  : [ 'error' ];

export const prisma = new PrismaClient({ log });
