import { prisma } from '../../frameworks/prisma/index.js';
import { dateService, environmentConfigService, nodeFileService, uuidService, winstonLoggerService } from '../../services/index.js';

import { GetStudentInteractor } from './getStudentInteractor.js';
import { GetStudentsInteractor } from './getStudentsInteractor.js';

// use-case interactor singletons
export const getStudentsInteractor = new GetStudentsInteractor(prisma, dateService, winstonLoggerService);
export const getStudentInteractor = new GetStudentInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
