import { prisma } from '../../frameworks/prisma';
import { uuidService, winstonLoggerService } from '../../services';
import { DeleteNewAssignmentTemplateInteractor } from './deletetNewAssignmentTemplateInteractor';
import { DeleteNewPartTemplateInteractor } from './deletetNewPartTemplateInteractor';
import { DeleteNewTextBoxTemplateInteractor } from './deletetNewTextBoxTemplateInteractor';
import { DeleteNewUnitTemplateInteractor } from './deletetNewUnitTemplateInteractor';
import { DeleteNewUploadSlotTemplateInteractor } from './deletetNewUploadSlotTemplateInteractor';
import { GetAllSchoolsInteractor } from './getAllSchoolsInteractor';
import { GetCourseInteractor } from './getCourseInteractor';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor';
import { GetSchoolInteractor } from './getSchoolInteractor';
import { InsertNewAssignmentTemplateInteractor } from './insertNewAssignmentTemplateInteractor';
import { InsertNewPartTemplateInteractor } from './insertNewPartTemplateInteractor';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor';
import { InsertNewUnitTemplateInteractor } from './insertNewUnitTemplateInteractor';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor';

// use-case interactor singletons
export const getAllSchoolsInteractor = new GetAllSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);

export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewUnitTemplateInteractor = new InsertNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUnitTemplateInteractor = new GetNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUnitTemplateInteractor = new DeleteNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewAssignmentTemplateInteractor = new InsertNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentTemplateInteractor = new GetNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewAssignmentTemplateInteractor = new DeleteNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewPartTemplateInteractor = new InsertNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewPartTemplateInteractor = new GetNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewPartTemplateInteractor = new SaveNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewPartTemplateInteractor = new DeleteNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewTextBoxTemplateInteractor = new InsertNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewTextBoxTemplateInteractor = new GetNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewTextBoxTemplateInteractor = new SaveNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewTextBoxTemplateInteractor = new DeleteNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewUploadSlotTemplateInteractor = new InsertNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUploadSlotTemplateInteractor = new GetNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewUploadSlotTemplateInteractor = new SaveNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUploadSlotTemplateInteractor = new DeleteNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
