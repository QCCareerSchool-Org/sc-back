import { prisma } from '../../frameworks/prisma/index.js';
import { axiosHttpService, dateService, environmentConfigService, extractZipUnzipService, fileTypeMimeTypeService, nodeFileService, sanitizerService, uuidService, winstonLoggerService } from '../../services/index.js';
import { CloseNewUnitReturnInteractor } from './closeNewUnitReturnInteractor.js';
import { DeleteNewAssignmentMediumInteractor } from './deleteNewAssignmentMediumInteractor.js';
import { DeleteNewAssignmentTemplateInteractor } from './deleteNewAssignmentTemplateInteractor.js';
import { DeleteNewPartMediumInteractor } from './deleteNewPartMediumInteractor.js';
import { DeleteNewPartTemplateInteractor } from './deleteNewPartTemplateInteractor.js';
import { DeleteNewTextBoxTemplateInteractor } from './deleteNewTextBoxTemplateInteractor.js';
import { DeleteNewUnitTemplateInteractor } from './deleteNewUnitTemplateInteractor.js';
import { DeleteNewUnitTemplatePricesInteractor } from './deleteNewUnitTemplatePricesInteractor.js';
import { DeleteNewUploadSlotTemplateInteractor } from './deleteNewUploadSlotTemplateInteractor.js';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor.js';
import { DownloadNewPartMediumInteractor } from './downloadNewPartMediumInteractor.js';
import { EnableCourseInteractor } from './enableCourseInteractor.js';
import { GetAllCountriesInteractor } from './getAllCountriesInteractor.js';
import { GetAllCoursesInteractor } from './getAllCoursesInteractor.js';
import { GetAllCurrenciesInteractor } from './getAllCurrenciesInteractor.js';
import { GetAllNewMaterialsInteractor } from './getAllNewMaterialsInteractor.js';
import { GetAllSchoolsInteractor } from './getAllSchoolsInteractor.js';
import { GetCountryInteractor } from './getCountryInteractor.js';
import { GetCourseInteractor } from './getCourseInteractor.js';
import { GetNewAssignmentMediumInteractor } from './getNewAssignmentMediumInteractor.js';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor.js';
import { GetNewMaterialInteractor } from './getNewMaterialInteractor.js';
import { GetNewPartMediumInteractor } from './getNewPartMediumInteractor.js';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor.js';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor.js';
import { GetNewUnitReturnInteractor } from './getNewUnitReturnInteractor.js';
import { GetNewUnitTemplateInteractor } from './getNewUnitTemplateInteractor.js';
import { GetNewUnitTemplatePricesInteractor } from './getNewUnitTemplatePricesInteractor.js';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor.js';
import { GetSchoolInteractor } from './getSchoolInteractor.js';
import { InsertNewAssignmentMediumInteractor } from './insertNewAssignmentMediumInteractor.js';
import { InsertNewAssignmentTemplateInteractor } from './insertNewAssignmentTemplateInteractor.js';
import { InsertNewMaterialInteractor } from './insertNewMaterialInteractor.js';
import { InsertNewPartMediumInteractor } from './insertNewPartMediumInteractor.js';
import { InsertNewPartTemplateInteractor } from './insertNewPartTemplateInteractor.js';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor.js';
import { InsertNewUnitTemplateInteractor } from './insertNewUnitTemplateInteractor.js';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor.js';
import { ReplaceNewMaterialFileInteractor } from './replaceNewMaterialFileInteractor.js';
import { ReplaceNewUnitTemplatePricesInteractor } from './replaceNewUnitTemplatePricesInteractor.js';
import { SaveNewAssignmentMediumInteractor } from './saveNewAssignmentMediumInteractor.js';
import { SaveNewAssignmentTemplateInteractor } from './saveNewAssignmentTemplateInteractor.js';
import { SaveNewMaterialInteractor } from './saveNewMaterialInteractor.js';
import { SaveNewPartMediumInteractor } from './saveNewPartMediumInteractor.js';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor.js';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor.js';
import { SaveNewUnitTemplateInteractor } from './saveNewUnitTemplateInteractor.js';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor.js';

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
export const downloadNewAssignmentMediumInteractor = new DownloadNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);

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
export const downloadNewPartMediumInteractor = new DownloadNewPartMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);

export const getNewUnitTemplatePricesInteractor = new GetNewUnitTemplatePricesInteractor(prisma, uuidService, winstonLoggerService);
export const replaceNewUnitTemplatePricesInteractor = new ReplaceNewUnitTemplatePricesInteractor(prisma, uuidService, winstonLoggerService);
export const deleteNewUnitTemplatePricesInteractor = new DeleteNewUnitTemplatePricesInteractor(prisma, winstonLoggerService);

export const getNewUnitReturnInteractor = new GetNewUnitReturnInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const closeNewUnitReturnInteractor = new CloseNewUnitReturnInteractor(prisma, uuidService, dateService, winstonLoggerService);

export const getAllNewMaterialsInteractor = new GetAllNewMaterialsInteractor(prisma, uuidService, winstonLoggerService);
export const getNewMaterialInteractor = new GetNewMaterialInteractor(prisma, uuidService, winstonLoggerService);
export const insertNewMaterialInteractor = new InsertNewMaterialInteractor(prisma, uuidService, axiosHttpService, nodeFileService, extractZipUnzipService, fileTypeMimeTypeService, environmentConfigService, winstonLoggerService);
export const saveNewMaterialInteractor = new SaveNewMaterialInteractor(prisma, uuidService, winstonLoggerService);
export const replaceNewMaterialFileInteractor = new ReplaceNewMaterialFileInteractor(prisma, uuidService, nodeFileService, extractZipUnzipService, environmentConfigService, winstonLoggerService);
