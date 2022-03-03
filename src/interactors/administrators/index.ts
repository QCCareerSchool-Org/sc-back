import { prisma } from '../../frameworks/prisma';
import { uuidService, winstonLoggerService } from '../../services';
import { GetCourseInteractor } from './getCourseInteractor';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor';
import { GetSchoolInteractor } from './getSchoolInteractor';
import { GetSchoolsInteractor } from './getSchoolsInteractor';

// use-case interactor singletons
export const getSchoolsInteractor = new GetSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);
export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUnitTemplateInteractor = new GetNewUnitTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewAssignmentTemplateInteractor = new GetNewAssignmentTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewPartTemplateInteractor = new GetNewPartTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewTextBoxTemplateInteractor = new GetNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);
export const getNewUploadSlotTemplateInteractor = new GetNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);
