import { prisma } from '../../frameworks/prisma';
import { uuidService, winstonLoggerService } from '../../services';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';

export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
