import { prisma } from '../../frameworks/prisma';
import { environmentConfigService, nodeFileService, uuidService, winstonLoggerService } from '../../services';
import { DeleteNewUploadSlotFileInteractor } from './deleteNewUploadSlotFileInteractor';
import { GetEnrollmentInteractor } from './getEnrollment';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';
import { GetNewUnitInteractor } from './getNewUnitInteractor';
import { SaveNewTextBoxTextInteractor } from './saveNewTextBoxTextInteractor';
import { UploadNewUploadSlotFileInteractor } from './uploadNewUploadSlotFileInteractor';

// use-case interactor singletons
export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
export const getEnrollmentInteractor = new GetEnrollmentInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const saveNewTextBoxTextInteractor = new SaveNewTextBoxTextInteractor(prisma, uuidService, winstonLoggerService);
export const uploadNewUploadSlotFileInteractor = new UploadNewUploadSlotFileInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const deleteNewUploadSlotFileInteractor = new DeleteNewUploadSlotFileInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
