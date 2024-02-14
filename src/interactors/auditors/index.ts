import { prisma } from '../../frameworks/prisma/index.js';
import { dateService, environmentConfigService, nodeCryptoService, nodeFileService, uuidService, winstonLoggerService } from '../../services/index.js';
import { GetAuditorInteractor } from './getAuditorInteractor.js';
import { GetEnrollmentInteractor } from './getEnrollmentInteractor.js';
import { GetStudentInteractor } from './getStudentInteractor.js';
import { GetStudentsInteractor } from './getStudentsInteractor.js';
import { UpdateEmailAddressInteractor } from './updateEmailAddressInteractor.js';
import { UpdatePasswordInteractor } from './updatePasswordInteractor.js';

// use-case interactor singletons
export const getAuditorInteractor = new GetAuditorInteractor(prisma, dateService, winstonLoggerService);
export const updateEmailAddressInteractor = new UpdateEmailAddressInteractor(prisma, dateService, nodeCryptoService, winstonLoggerService);
export const updatePasswordInteractor = new UpdatePasswordInteractor(prisma, dateService, nodeCryptoService, winstonLoggerService);
export const getStudentsInteractor = new GetStudentsInteractor(prisma, dateService, winstonLoggerService);
export const getStudentInteractor = new GetStudentInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const getEnrollmentInteractor = new GetEnrollmentInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
