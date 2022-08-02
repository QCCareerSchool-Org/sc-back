import { prisma } from '../../frameworks/prisma/index.js';
import { dateService, emailValidatorService, environmentConfigService, nodeFileService, sanitizerService, uuidService, winstonLoggerService, zLibcompressionService } from '../../services/index.js';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor.js';
import { DownloadNewPartMediumInteractor } from './downloadNewPartMediumInteractor.js';
import { DownloadNewUploadSlotInteractor } from './downloadNewUploadSlotInteractor.js';
import { EraseNewUploadSlotInteractor } from './eraseNewUploadSlotInteractor.js';
import { GetEnrollmentInteractor } from './getEnrollment.js';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor.js';
import { GetNewUnitInteractor } from './getNewUnitInteractor.js';
import { GetStudentInteractor } from './getStudentInteractor.js';
import { GetT2202ReceiptsInteractor } from './getT2202Receipts.js';
import { InitializeNextNewUnitInteractor } from './initializeNextNewUnitInteractor.js';
import { LessonGuardInteractor } from './lessonGuardInteractor.js';
import { SaveNewTextBoxTextInteractor } from './saveNewTextBoxTextInteractor.js';
import { SkipNewUnitInteractor } from './skipNewUnitInteractor.js';
import { SubmitNewUnitInteractor } from './submitNewUnitInteractor.js';
import { UpdateEmailAddressInteractor } from './updateEmailAddressInteractor.js';
import { UploadNewUploadSlotInteractor } from './uploadNewUploadSlotInteractor.js';

// use-case interactor singletons
export const lessonGuardInteractor = new LessonGuardInteractor(prisma, uuidService, winstonLoggerService);

export const getStudentInteractor = new GetStudentInteractor(prisma, winstonLoggerService);
export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
export const getEnrollmentInteractor = new GetEnrollmentInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const saveNewTextBoxTextInteractor = new SaveNewTextBoxTextInteractor(prisma, uuidService, winstonLoggerService);
export const uploadNewUploadSlotInteractor = new UploadNewUploadSlotInteractor(prisma, uuidService, nodeFileService, zLibcompressionService, environmentConfigService, winstonLoggerService);
export const eraseNewUploadSlotInteractor = new EraseNewUploadSlotInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewUploadSlotInteractor = new DownloadNewUploadSlotInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);
export const submitNewUnitInteractor = new SubmitNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const skipNewUnitInteractor = new SkipNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const initializeNextNewUnitInteractor = new InitializeNextNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const downloadNewAssignmentMediumInteractor = new DownloadNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);
export const downloadNewPartMediumInteractor = new DownloadNewPartMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);
export const updateEmailAddressInteractor = new UpdateEmailAddressInteractor(prisma, emailValidatorService, winstonLoggerService);
export const getT2202ReceiptsInteractor = new GetT2202ReceiptsInteractor(prisma, winstonLoggerService);
