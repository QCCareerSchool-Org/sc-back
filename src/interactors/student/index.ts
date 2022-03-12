import { prisma } from '../../frameworks/prisma';
import { dateService, environmentConfigService, nodeFileService, santitizerService, uuidService, winstonLoggerService, zLibcompressionService } from '../../services';
import { DeleteNewUploadSlotFileInteractor } from './deleteNewUploadSlotFileInteractor';
import { DownloadNewAssignmentMediumFileInteractor } from './downloadNewAssignmentMediumFileInteractor';
import { DownloadNewUploadSlotFileInteractor } from './downloadNewUploadSlotFileInteractor';
import { GetEnrollmentInteractor } from './getEnrollment';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';
import { GetNewUnitInteractor } from './getNewUnitInteractor';
import { GetStudentInteractor } from './getStudentInteractor';
import { InitializeNextNewUnitInteractor } from './initializeNextNewUnitInteractor';
import { SaveNewTextBoxTextInteractor } from './saveNewTextBoxTextInteractor';
import { SkipNewUnitInteractor } from './skipNewUnitInteractor';
import { SubmitNewUnitInteractor } from './submitNewUnitInteractor';
import { UploadNewUploadSlotFileInteractor } from './uploadNewUploadSlotFileInteractor';

// use-case interactor singletons
export const getStudentInteractor = new GetStudentInteractor(prisma, winstonLoggerService);
export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
export const getEnrollmentInteractor = new GetEnrollmentInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const saveNewTextBoxTextInteractor = new SaveNewTextBoxTextInteractor(prisma, uuidService, winstonLoggerService);
export const uploadNewUploadSlotFileInteractor = new UploadNewUploadSlotFileInteractor(prisma, uuidService, nodeFileService, zLibcompressionService, environmentConfigService, winstonLoggerService);
export const deleteNewUploadSlotFileInteractor = new DeleteNewUploadSlotFileInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewUploadSlotFileInteractor = new DownloadNewUploadSlotFileInteractor(prisma, uuidService, nodeFileService, zLibcompressionService, santitizerService, environmentConfigService, winstonLoggerService);
export const submitNewUnitInteractor = new SubmitNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const skipNewUnitInteractor = new SkipNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const initializeNextNewUnitInteractor = new InitializeNextNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const downloadNewAssignmentMediumFileInteractor = new DownloadNewAssignmentMediumFileInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);
