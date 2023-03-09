import { prisma } from '../../frameworks/prisma/index.js';
import { axiosHttpService, dateService, environmentConfigService, extractZipUnzipService, fileTypeMimeTypeService, nodeFileService, sanitizerService, uuidService, winstonLoggerService } from '../../services/index.js';
import { CloseNewSubmissionReturnInteractor } from './closeNewSubmissionReturnInteractor.js';
import { DeleteMaterialImageInteractor } from './deleteMaterialImageInteractor.js';
import { DeleteMaterialInteractor } from './deleteMaterialInteractor.js';
import { DeleteNewAssignmentMediumInteractor } from './deleteNewAssignmentMediumInteractor.js';
import { DeleteNewAssignmentTemplateInteractor } from './deleteNewAssignmentTemplateInteractor.js';
import { DeleteNewPartMediumInteractor } from './deleteNewPartMediumInteractor.js';
import { DeleteNewPartTemplateInteractor } from './deleteNewPartTemplateInteractor.js';
import { DeleteNewSubmissionTemplateInteractor } from './deleteNewSubmissionTemplateInteractor.js';
import { DeleteNewSubmissionTemplatePricesInteractor } from './deleteNewSubmissionTemplatePricesInteractor.js';
import { DeleteNewTextBoxTemplateInteractor } from './deleteNewTextBoxTemplateInteractor.js';
import { DeleteNewUploadSlotTemplateInteractor } from './deleteNewUploadSlotTemplateInteractor.js';
import { DeleteUnitInteractor } from './deleteUnitInteractor.js';
import { DownloadMaterialImageInteractor } from './downloadMaterialImageInteractor.js';
import { DownloadNewAssignmentMediumInteractor } from './downloadNewAssignmentMediumInteractor.js';
import { DownloadNewPartMediumInteractor } from './downloadNewPartMediumInteractor.js';
import { DownloadNewSubmissionFeedbackInteractor } from './downloadNewSubmissionFeedbackInteractor.js';
import { EnableCourseInteractor } from './enableCourseInteractor.js';
import { GetAllCountriesInteractor } from './getAllCountriesInteractor.js';
import { GetAllCoursesInteractor } from './getAllCoursesInteractor.js';
import { GetAllCurrenciesInteractor } from './getAllCurrenciesInteractor.js';
import { GetAllSchoolsInteractor } from './getAllSchoolsInteractor.js';
import { GetCountryInteractor } from './getCountryInteractor.js';
import { GetCourseInteractor } from './getCourseInteractor.js';
import { GetMaterialInteractor } from './getMaterialInteractor.js';
import { GetNewAssignmentInteractor } from './getNewAssignmentInteractor.js';
import { GetNewAssignmentMediumInteractor } from './getNewAssignmentMediumInteractor.js';
import { GetNewAssignmentTemplateInteractor } from './getNewAssignmentTemplateInteractor.js';
import { GetNewPartMediumInteractor } from './getNewPartMediumInteractor.js';
import { GetNewPartTemplateInteractor } from './getNewPartTemplateInteractor.js';
import { GetNewSubmissionInteractor } from './getNewSubmissionInteractor.js';
import { GetNewSubmissionReturnInteractor } from './getNewSubmissionReturnInteractor.js';
import { GetNewSubmissionTemplateInteractor } from './getNewSubmissionTemplateInteractor.js';
import { GetNewSubmissionTemplatePricesInteractor } from './getNewSubmissionTemplatePricesInteractor.js';
import { GetNewTextBoxTemplateInteractor } from './getNewTextBoxTemplateInteractor.js';
import { GetNewUploadSlotTemplateInteractor } from './getNewUploadSlotTemplateInteractor.js';
import { GetSchoolInteractor } from './getSchoolInteractor.js';
import { GetStudentInteractor } from './getStudentInteractor.js';
import { GetUnitInteractor } from './getUnitInteractor.js';
import { InsertMaterialInteractor } from './insertMaterialInteractor.js';
import { InsertNewAssignmentMediumInteractor } from './insertNewAssignmentMediumInteractor.js';
import { InsertNewAssignmentTemplateInteractor } from './insertNewAssignmentTemplateInteractor.js';
import { InsertNewPartMediumInteractor } from './insertNewPartMediumInteractor.js';
import { InsertNewPartTemplateInteractor } from './insertNewPartTemplateInteractor.js';
import { InsertNewSubmissionTemplateInteractor } from './insertNewSubmissionTemplateInteractor.js';
import { InsertNewTextBoxTemplateInteractor } from './insertNewTextBoxTemplateInteractor.js';
import { InsertNewUploadSlotTemplateInteractor } from './insertNewUploadSlotTemplateInteractor.js';
import { InsertUnitInteractor } from './insertUnitInteractor.js';
import { ReplaceMaterialContentInteractor } from './replaceMaterialContentInteractor.js';
import { ReplaceMaterialImageInteractor } from './replaceMaterialImageInteractor.js';
import { ReplaceNewSubmissionTemplatePricesInteractor } from './replaceNewSubmissionTemplatePricesInteractor.js';
import { SaveMaterialInteractor } from './saveMaterialInteractor.js';
import { SaveNewAssignmentMediumInteractor } from './saveNewAssignmentMediumInteractor.js';
import { SaveNewAssignmentTemplateInteractor } from './saveNewAssignmentTemplateInteractor.js';
import { SaveNewPartMediumInteractor } from './saveNewPartMediumInteractor.js';
import { SaveNewPartTemplateInteractor } from './saveNewPartTemplateInteractor.js';
import { SaveNewSubmissionTemplateInteractor } from './saveNewSubmissionTemplateInteractor.js';
import { SaveNewTextBoxTemplateInteractor } from './saveNewTextBoxTemplateInteractor.js';
import { SaveNewUploadSlotTemplateInteractor } from './saveNewUploadSlotTemplateInteractor.js';
import { SaveUnitInteractor } from './saveUnitInteractor.js';

// use-case interactor singletons
export const getStudentInteractor = new GetStudentInteractor(prisma, dateService, winstonLoggerService);

export const getAllSchoolsInteractor = new GetAllSchoolsInteractor(prisma, winstonLoggerService);
export const getSchoolInteractor = new GetSchoolInteractor(prisma, winstonLoggerService);

export const getAllCoursesInteractor = new GetAllCoursesInteractor(prisma, winstonLoggerService);
export const getCourseInteractor = new GetCourseInteractor(prisma, uuidService, winstonLoggerService);
export const enableCourseInteractor = new EnableCourseInteractor(prisma, winstonLoggerService);

export const getAllCountriesInteractor = new GetAllCountriesInteractor(prisma, winstonLoggerService);
export const getCountryInteractor = new GetCountryInteractor(prisma, winstonLoggerService);

export const getAllCurrenciesInteractor = new GetAllCurrenciesInteractor(prisma, winstonLoggerService);

export const insertNewSubmissionTemplateInteractor = new InsertNewSubmissionTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewSubmissionTemplateInteractor = new GetNewSubmissionTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewSubmissionTemplateInteractor = new SaveNewSubmissionTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewSubmissionTemplateInteractor = new DeleteNewSubmissionTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewAssignmentTemplateInteractor = new InsertNewAssignmentTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewAssignmentTemplateInteractor = new GetNewAssignmentTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewAssignmentTemplateInteractor = new SaveNewAssignmentTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewAssignmentTemplateInteractor = new DeleteNewAssignmentTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewAssignmentMediumInteractor = new InsertNewAssignmentMediumInteractor(prisma, axiosHttpService, uuidService, nodeFileService, sanitizerService, dateService, environmentConfigService, winstonLoggerService);
export const getNewAssignmentMediumInteractor = new GetNewAssignmentMediumInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewAssignmentMediumInteractor = new SaveNewAssignmentMediumInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewAssignmentMediumInteractor = new DeleteNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const downloadNewAssignmentMediumInteractor = new DownloadNewAssignmentMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);

export const insertNewPartTemplateInteractor = new InsertNewPartTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewPartTemplateInteractor = new GetNewPartTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewPartTemplateInteractor = new SaveNewPartTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewPartTemplateInteractor = new DeleteNewPartTemplateInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);

export const insertNewTextBoxTemplateInteractor = new InsertNewTextBoxTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewTextBoxTemplateInteractor = new GetNewTextBoxTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewTextBoxTemplateInteractor = new SaveNewTextBoxTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewTextBoxTemplateInteractor = new DeleteNewTextBoxTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewUploadSlotTemplateInteractor = new InsertNewUploadSlotTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewUploadSlotTemplateInteractor = new GetNewUploadSlotTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewUploadSlotTemplateInteractor = new SaveNewUploadSlotTemplateInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewUploadSlotTemplateInteractor = new DeleteNewUploadSlotTemplateInteractor(prisma, uuidService, winstonLoggerService);

export const insertNewPartMediumInteractor = new InsertNewPartMediumInteractor(prisma, axiosHttpService, uuidService, nodeFileService, sanitizerService, dateService, environmentConfigService, winstonLoggerService);
export const getNewPartMediumInteractor = new GetNewPartMediumInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveNewPartMediumInteractor = new SaveNewPartMediumInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewPartMediumInteractor = new DeleteNewPartMediumInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const downloadNewPartMediumInteractor = new DownloadNewPartMediumInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);

export const getNewSubmissionTemplatePricesInteractor = new GetNewSubmissionTemplatePricesInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const replaceNewSubmissionTemplatePricesInteractor = new ReplaceNewSubmissionTemplatePricesInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteNewSubmissionTemplatePricesInteractor = new DeleteNewSubmissionTemplatePricesInteractor(prisma, winstonLoggerService);

export const getNewSubmissionReturnInteractor = new GetNewSubmissionReturnInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const closeNewSubmissionReturnInteractor = new CloseNewSubmissionReturnInteractor(prisma, uuidService, dateService, winstonLoggerService);

export const getUnitInteractor = new GetUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const insertUnitInteractor = new InsertUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const saveUnitInteractor = new SaveUnitInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const deleteUnitInteractor = new DeleteUnitInteractor(prisma, uuidService, winstonLoggerService);

export const getMaterialInteractor = new GetMaterialInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const insertMaterialInteractor = new InsertMaterialInteractor(prisma, uuidService, axiosHttpService, nodeFileService, extractZipUnzipService, fileTypeMimeTypeService, sanitizerService, dateService, environmentConfigService, winstonLoggerService);
export const saveMaterialInteractor = new SaveMaterialInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const replaceMaterialContentInteractor = new ReplaceMaterialContentInteractor(prisma, uuidService, nodeFileService, extractZipUnzipService, dateService, environmentConfigService, winstonLoggerService);
export const replaceMaterialImageInteractor = new ReplaceMaterialImageInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const deleteMaterialImageInteractor = new DeleteMaterialImageInteractor(prisma, uuidService, nodeFileService, dateService, environmentConfigService, winstonLoggerService);
export const deleteMaterialInteractor = new DeleteMaterialInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
export const downloadMaterialImageInteractor = new DownloadMaterialImageInteractor(prisma, uuidService, nodeFileService, sanitizerService, environmentConfigService, winstonLoggerService);

export const getNewSubmissionInteractor = new GetNewSubmissionInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const getNewAssignmentInteractor = new GetNewAssignmentInteractor(prisma, uuidService, dateService, winstonLoggerService);
export const downloadNewSubmissionFeedbackInteractor = new DownloadNewSubmissionFeedbackInteractor(prisma, uuidService, nodeFileService, environmentConfigService, winstonLoggerService);
