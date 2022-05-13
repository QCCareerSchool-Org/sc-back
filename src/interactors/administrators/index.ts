import { prisma } from '../../frameworks/prisma';
import { axiosHttpService, environmentConfigService, nodeFileService, santitizerService, uuidService, winstonLoggerService } from '../../services/index';
import { DeleteNewAssignmentMediumInteractor } from './deleteNewAssignmentMediumInteractor';
import { DeleteNewAssignmentTemplateInteractor } from './deleteNewAssignmentTemplateInteractor';
import { DeleteNewPartMediumInteractor } from './deleteNewPartMediumInteractor';
import { DeleteNewPartTemplateInteractor } from './deleteNewPartTemplateInteractor';
import { DeleteNewTextBoxTemplateInteractor } from './deleteNewTextBoxTemplateInteractor';
import { DeleteNewUnitTemplateInteractor } from './deleteNewUnitTemplateInteractor';
import { DeleteNewUnitTemplatePricesInteractor } from './deleteNewUnitTemplatePricesInteractor';
import { DeleteNewUploadSlotTemplateInteractor } from './deleteNewUploadSlotTemplateInteractor';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor';
import { DownloadNewPartMediumInteractor } from './downloadNewPartMediumInteractor';
import { EnableCourseInteractor } from './enableCourseInteractor';
import { GetAllCountriesInteractor } from './getAllCountriesInteractor';
import { GetAllCoursesInteractor } from './getAllCoursesInteractor';
import { GetAllCurrenciesInteractor } from './getAllCurrenciesInteractor';
import { GetAllSchoolsInteractor } from './getAllSchoolsInteractor';
import { GetCountryInteractor } from './getCountryInteractor';
import { GetCourseInteractor } from './getCourseInteractor';
import { GetNewAssignmentMediumInteractor } from './getNewAssignmentMediumInteractor';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor';
import { GetNewPartMediumInteractor } from './getNewPartMediumInteractor';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor';
import { GetNewUnitTemplatePricesInteractor } from './getNewUnitTemplatePricesInteractor';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor';
import { GetSchoolInteractor } from './getSchoolInteractor';
import { InsertNewAssignmentMediumInteractor } from './insertNewAssignmentMediumInteractor';
import { InsertNewAssignmentTemplateInteractor } from './insertNewAssignmentTemplateInteractor';
import { InsertNewPartMediumInteractor } from './insertNewPartMediumInteractor';
import { InsertNewPartTemplateInteractor } from './insertNewPartTemplateInteractor';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor';
import { InsertNewUnitTemplateInteractor } from './insertNewUnitTemplateInteractor';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor';
import { ReplaceNewUnitTemplatePricesInteractor } from './replaceNewUnitTemplatePricesInteractor';
import { SaveNewAssignmentMediumInteractor } from './saveNewAssignmentMediumInteractor';
import { SaveNewAssignmentTemplateInteractor } from './saveNewAssignmentTemplateInteractor';
import { SaveNewPartMediumInteractor } from './saveNewPartMediumInteractor';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor';
import { SaveNewUnitTemplateInteractor } from './saveNewUnitTemplateInteractor';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor';

// use-case interactor singletons
export const getAllSchoolsInteractor = new GetAllSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);

export const getAllCoursesInteractor = new GetAllCoursesInteractor(prisma, winstonLoggerService);
export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);
export const enableCourseInteractor = new EnableCourseInteractor(prisma, winstonLoggerService);

export const getAllCountriesInteractor = new GetAllCountriesInteractor(prisma, winstonLoggerService);
export const getCountryInteractor = new GetCountryInteractor(prisma, winstonLoggerService);

export const getAllCurrenciesInteractor = new GetAllCurrenciesInteractor(prisma, winstonLoggerService);

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
export const saveNewAssignmentMediumInteractor = new SaveNewAssignmentMediumInteractor(prisma, uuidService, winstonLoggerService);
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

export const insertNewPartMediumInteractor = new InsertNewPartMediumInteractor(prisma, axiosHttpService, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const getNewPartMediumInteractor = new GetNewPartMediumInteractor(prisma, uuidService, winstonLoggerService);
export const saveNewPartMediumInteractor = new SaveNewPartMediumInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewPartMediumInteractor = new DeleteNewPartMediumInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadNewPartMediumInteractor = new DownloadNewPartMediumInteractor(prisma, uuidService, nodeFileService, santitizerService, environmentConfigService, winstonLoggerService);

export const getNewUnitTemplatePricesInteractor = new GetNewUnitTemplatePricesInteractor(prisma, uuidService, winstonLoggerService);
export const replaceNewUnitTemplatePricesInteractor = new ReplaceNewUnitTemplatePricesInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUnitTemplatePricesInteractor = new DeleteNewUnitTemplatePricesInteractor(prisma, uuidService, winstonLoggerService);
