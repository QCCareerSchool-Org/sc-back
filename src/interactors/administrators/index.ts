import { prisma } from '../../frameworks/prisma';
import { uuidService, winstonLoggerService } from '../../services';
import { DeleteNewTextBoxTemplateInteractor } from './deletetNewTextBoxTemplateInteractor';
import { DeleteNewUploadSlotTemplateInteractor } from './deletetNewUploadSlotTemplateInteractor';
import { GetCourseInteractor } from './getCourseInteractor';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor';
import { GetSchoolInteractor } from './getSchoolInteractor';
import { GetSchoolsInteractor } from './getSchoolsInteractor';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor';

// use-case interactor singletons
export const getSchoolsInteractor = new GetSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);

export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);

export const getNewUnitTemplateInteractor = new GetNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const getNewAssignmentTemplateInteractor = new GetNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const getNewPartTemplateInteractor = new GetNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewPartTemplateInteractor = new SaveNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const getNewTextBoxTemplateInteractor = new GetNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewTextBoxTemplateInteractor = new SaveNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const insertNewTextBoxTemplateInteractor = new InsertNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewTextBoxTemplateInteractor = new DeleteNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const getNewUploadSlotTemplateInteractor = new GetNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewUploadSlotTemplateInteractor = new SaveNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const insertNewUploadSlotTemplateInteractor = new InsertNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUploadSlotTemplateInteractor = new DeleteNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
