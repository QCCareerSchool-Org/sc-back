import { prisma } from '../../frameworks/prisma';
import { dateService, environmentConfigService, nodeFileService, santitizerService, uuidService, winstonLoggerService, zLibcompressionService } from '../../services';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor';
import { DownloadNewPartMediumInteractor } from './downloadNewPartMediumInteractor';
import { DownloadNewUploadSlotInteractor } from './downloadNewUploadSlotInteractor';
import { EraseNewUploadSlotInteractor } from './eraseNewUploadSlotInteractor';
import { GetEnrollmentInteractor } from './getEnrollment';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';
import { GetNewUnitInteractor } from './getNewUnitInteractor';
import { GetStudentInteractor } from './getStudentInteractor';
import { InitializeNextNewUnitInteractor } from './initializeNextNewUnitInteractor';
import { LessonGuardInteractor } from './lessonGuardInteractor';
import { SaveNewTextBoxTextInteractor } from './saveNewTextBoxTextInteractor';
import { SkipNewUnitInteractor } from './skipNewUnitInteractor';
import { SubmitNewUnitInteractor } from './submitNewUnitInteractor';
import { UploadNewUploadSlotInteractor } from './uploadNewUploadSlotInteractor';

// use-case interactor singletons
export const lessonGuardInteractor = new LessonGuardInteractor(prisma, winstonLoggerService);

export const getStudentInteractor = new GetStudentInteractor(prisma, winstonLoggerService);
export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
export const getEnrollmentInteractor = new GetEnrollmentInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const saveNewTextBoxTextInteractor = new SaveNewTextBoxTextInteractor(prisma, uuidService, winstonLoggerService);
export const uploadNewUploadSlotInteractor = new UploadNewUploadSlotInteractor(prisma, uuidService, nodeFileService, zLibcompressionService, environmentConfigService, winstonLoggerService);
export const eraseNewUploadSlotInteractor = new EraseNewUploadSlotInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewUploadSlotInteractor = new DownloadNewUploadSlotInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);
export const submitNewUnitInteractor = new SubmitNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const skipNewUnitInteractor = new SkipNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const initializeNextNewUnitInteractor = new InitializeNextNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const downloadNewAssignmentMediumInteractor = new DownloadNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);
export const downloadNewPartMediumInteractor = new DownloadNewPartMediumInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);
