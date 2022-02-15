import { prisma } from '../../frameworks/prisma';
import { uuidService, winstonLoggerService } from '../../services';
import { GetAllNewUnitsInteractor } from './getAllNewUnitsInteractor';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';
import { GetNewUnitInteractor } from './getNewUnitInteractor';

// use-case interactor singletons
export const getAllNewUnitsInteractor = new GetAllNewUnitsInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
