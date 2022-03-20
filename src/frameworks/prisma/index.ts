import type { Prisma } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { environmentConfigService } from '../../services';

const log: Prisma.LogLevel[] = environmentConfigService.config.environment === 'development'
  ? [ 'warn', 'error' ]
  : [ ];

export const prisma = new PrismaClient({ log });
