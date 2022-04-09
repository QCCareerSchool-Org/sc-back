import { prisma } from '../../frameworks/prisma';
import { dateService, environmentConfigService, nodeFileService, santitizerService, uuidService, winstonLoggerService } from '../../services';
import { CloseNewUnitInteractor } from './closeNewUnitInteractor';
import { DownloadNewUnitFeedbackInteractor } from './downloadNewUnitFeedbackInteractor';
import { EraseNewUnitFeedbackInteractor } from './eraseNewUnitFeedbackInteractor';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor';
import { GetNewUnitInteractor } from './getNewUnitInteractor';
import { ReturnNewUnitInteractor } from './returnNewUnitInteractor';
import { SaveNewTextBoxMarkInteractor } from './saveNewTextBoxMarkInteractor';
import { UploadNewUnitFeedbackInteractor } from './uploadNewUnitFeedbackInteractor';

export const getNewUnitInteractor = new GetNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, winstonLoggerService);
export const uploadNewUnitFeedbackInteractor = new UploadNewUnitFeedbackInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewUnitFeedbackInteractor = new DownloadNewUnitFeedbackInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);
export const eraseNewUnitFeedbackInteractor = new EraseNewUnitFeedbackInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const closeNewUnitInteractor = new CloseNewUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const returnNewUnitInteractor = new ReturnNewUnitInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewTextBoxMarkInteractor = new SaveNewTextBoxMarkInteractor(prisma, uuidService, winstonLoggerService);
