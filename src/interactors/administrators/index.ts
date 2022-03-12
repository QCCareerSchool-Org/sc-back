import { prisma } from '../../frameworks/prisma';
import { axiosHttpService, environmentConfigService, nodeFileService, santitizerService, uuidService, winstonLoggerService } from '../../services';
import { DeleteNewAssignmentMediumInteractor } from './deletetNewAssignmentMediumInteractor';
import { DeleteNewAssignmentTemplateInteractor } from './deletetNewAssignmentTemplateInteractor';
import { DeleteNewPartTemplateInteractor } from './deletetNewPartTemplateInteractor';
import { DeleteNewTextBoxTemplateInteractor } from './deletetNewTextBoxTemplateInteractor';
import { DeleteNewUnitTemplateInteractor } from './deletetNewUnitTemplateInteractor';
import { DeleteNewUploadSlotTemplateInteractor } from './deletetNewUploadSlotTemplateInteractor';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor';
import { GetAllSchoolsInteractor } from './getAllSchoolsInteractor';
import { GetCourseInteractor } from './getCourseInteractor';
import { GetNewAssignmentMediumInteractor } from './getNewAssignmentMediumInteractor';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor';
import { GetSchoolInteractor } from './getSchoolInteractor';
import { InsertNewAssignmentMediumInteractor } from './insertNewAssignmentMediumInteractor';
import { InsertNewAssignmentTemplateInteractor } from './insertNewAssignmentTemplateInteractor';
import { InsertNewPartTemplateInteractor } from './insertNewPartTemplateInteractor';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor';
import { InsertNewUnitTemplateInteractor } from './insertNewUnitTemplateInteractor';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor';
import { SaveNewAssignmentTemplateInteractor } from './saveNewAssignmentTemplateInteractor';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor';
import { SaveNewUnitTemplateInteractor } from './saveNewUnitTemplateInteractor';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor';

// use-case interactor singletons
export const getAllSchoolsInteractor = new GetAllSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);

export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewUnitTemplateInteractor = new InsertNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUnitTemplateInteractor = new GetNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewUnitTemplateInteractor = new SaveNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUnitTemplateInteractor = new DeleteNewUnitTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewAssignmentTemplateInteractor = new InsertNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentTemplateInteractor = new GetNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewAssignmentTemplateInteractor = new SaveNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewAssignmentTemplateInteractor = new DeleteNewAssignmentTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewAssignmentMediumInteractor = new InsertNewAssignmentMediumInteractor(prisma, axiosHttpService, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const getNewAssignmentMediumInteractor = new GetNewAssignmentMediumInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewAssignmentMediumInteractor = new DeleteNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewAssignmentMediumInteractor = new DownloadNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);

export const insertNewPartTemplateInteractor = new InsertNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewPartTemplateInteractor = new GetNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewPartTemplateInteractor = new SaveNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewPartTemplateInteractor = new DeleteNewPartTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewTextBoxTemplateInteractor = new InsertNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewTextBoxTemplateInteractor = new GetNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewTextBoxTemplateInteractor = new SaveNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewTextBoxTemplateInteractor = new DeleteNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewUploadSlotTemplateInteractor = new InsertNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUploadSlotTemplateInteractor = new GetNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewUploadSlotTemplateInteractor = new SaveNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUploadSlotTemplateInteractor = new DeleteNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
