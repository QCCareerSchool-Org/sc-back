import { Router } from 'express';
import multer from 'multer';

import { AdministratorGuardMiddleware } from '../../controllers/administrators/administratorGuardMiddleware.js';
import { CloseNewUnitReturnController } from '../../controllers/administrators/closeNewUnitReturnController.js';
import { DeleteNewAssignmentMediumController } from '../../controllers/administrators/deleteNewAssignmentMediumController.js';
import { DeleteNewAssignmentTemplateController } from '../../controllers/administrators/deleteNewAssignmentTemplateController.js';
import { DeleteNewMaterialController } from '../../controllers/administrators/deleteNewMaterialController.js';
import { DeleteNewPartMediumController } from '../../controllers/administrators/deleteNewPartMediumController.js';
import { DeleteNewPartTemplateController } from '../../controllers/administrators/deleteNewPartTemplateController.js';
import { DeleteNewTextBoxTemplateController } from '../../controllers/administrators/deleteNewTextBoxTemplateController.js';
import { DeleteNewUnitTemplateController } from '../../controllers/administrators/deleteNewUnitTemplateController.js';
import { DeleteNewUnitTemplatePricesController } from '../../controllers/administrators/deleteNewUnitTemplatePricesController.js';
import { DeleteNewUploadSlotTemplateController } from '../../controllers/administrators/deleteNewUploadSlotTemplateController.js';
import { DownloadNewAssignmentMediumController } from '../../controllers/administrators/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/administrators/downloadNewPartMediumController.js';
import { EnableCourseController } from '../../controllers/administrators/enableCourseController.js';
import { GetAllCountriesController } from '../../controllers/administrators/getAllCountriesController.js';
import { GetAllCoursesController } from '../../controllers/administrators/getAllCoursesController.js';
import { GetAllCurrenciesController } from '../../controllers/administrators/getAllCurrenciesController.js';
import { GetAllSchoolsController } from '../../controllers/administrators/getAllSchoolsController.js';
import { GetCountryController } from '../../controllers/administrators/getCountryController.js';
import { GetCourseController } from '../../controllers/administrators/getCourseController.js';
import { GetNewAssignmentMediumController } from '../../controllers/administrators/getNewAssignmentMediumController.js';
import { GetNewAssignmentTemplateController } from '../../controllers/administrators/getNewAssignmentTemplateController.js';
import { GetNewMaterialController } from '../../controllers/administrators/getNewMaterialController.js';
import { GetNewMaterialUnitController } from '../../controllers/administrators/getNewMaterialUnitController.js';
import { GetNewPartMediumController } from '../../controllers/administrators/getNewPartMediumController.js';
import { GetNewPartTemplateController } from '../../controllers/administrators/getNewPartTemplateController.js';
import { GetNewTextBoxTemplateController } from '../../controllers/administrators/getNewTextBoxTemplateController.js';
import { GetNewUnitReturnController } from '../../controllers/administrators/getNewUnitReturnController.js';
import { GetNewUnitTemplateController } from '../../controllers/administrators/getNewUnitTemplateController.js';
import { GetNewUnitTemplatePricesController } from '../../controllers/administrators/getNewUnitTemplatePricesController.js';
import { GetNewUploadSlotTemplateController } from '../../controllers/administrators/getNewUploadSlotTemplateController.js';
import { GetSchoolController } from '../../controllers/administrators/getSchoolController.js';
import { InsertNewAssignmentMediumController } from '../../controllers/administrators/insertNewAssignmentMediumController.js';
import { InsertNewAssignmentTemplateController } from '../../controllers/administrators/insertNewAssignmentTemplateController.js';
import { InsertNewMaterialController } from '../../controllers/administrators/insertNewMaterialController.js';
import { InsertNewMaterialUnitController } from '../../controllers/administrators/insertNewMaterialUnitController.js';
import { InsertNewPartMediumController } from '../../controllers/administrators/insertNewPartMediumController.js';
import { InsertNewPartTemplateController } from '../../controllers/administrators/insertNewPartTemplateController.js';
import { InsertNewTextBoxTemplateController } from '../../controllers/administrators/insertNewTextBoxTemplateController.js';
import { InsertNewUnitTemplateController } from '../../controllers/administrators/insertNewUnitTemplateController.js';
import { InsertNewUploadSlotTemplateController } from '../../controllers/administrators/insertNewUploadSlotTemplateController.js';
import { ReplaceNewMaterialFileController } from '../../controllers/administrators/replaceNewMaterialFileController.js';
import { ReplaceNewUnitTemplatePricesController } from '../../controllers/administrators/replaceNewUnitTemplatePricesController.js';
import { SaveNewAssignmentMediumController } from '../../controllers/administrators/saveNewAssignmentMediumController.js';
import { SaveNewAssignmentTemplateController } from '../../controllers/administrators/saveNewAssignmentTemplateController.js';
import { SaveNewMaterialController } from '../../controllers/administrators/saveNewMaterialController.js';
import { SaveNewPartMediumController } from '../../controllers/administrators/saveNewPartMediumController.js';
import { SaveNewPartTemplateController } from '../../controllers/administrators/saveNewPartTemplateController.js';
import { SaveNewTextBoxTemplateController } from '../../controllers/administrators/saveNewTextBoxTemplateController.js';
import { SaveNewUnitTemplateController } from '../../controllers/administrators/saveNewUnitTemplateController.js';
import { SaveNewUploadSlotTemplateController } from '../../controllers/administrators/saveNewUploadSlotTemplateController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const administratorRouter = Router();

const routes: Route[] = [
  // only the administrator in question should be able to access this path
  [ 'use', '/:administratorId', AdministratorGuardMiddleware ],
  // schools
  [ 'get', '/:administratorId/schools', GetAllSchoolsController ],
  [ 'get', '/:administratorId/schools/:schoolId', GetSchoolController ],
  // courses
  [ 'get', '/:administratorId/courses', GetAllCoursesController ],
  [ 'get', '/:administratorId/courses/:courseId', GetCourseController ],
  [ 'post', '/:administratorId/courses/:courseId/enable', EnableCourseController ],
  // countries
  [ 'get', '/:administratorId/countries', GetAllCountriesController ],
  [ 'get', '/:administratorId/countries/:countryId', GetCountryController ],
  // currencies
  [ 'get', '/:administratorId/currencies', GetAllCurrenciesController ],
  // new unit templates
  [ 'post', '/:administratorId/newUnitTemplates', InsertNewUnitTemplateController ],
  [ 'get', '/:administratorId/newUnitTemplates/:unitId', GetNewUnitTemplateController ],
  [ 'put', '/:administratorId/newUnitTemplates/:unitId', SaveNewUnitTemplateController ],
  [ 'delete', '/:administratorId/newUnitTemplates/:unitId', DeleteNewUnitTemplateController ],
  // new assignment templates
  [ 'post', '/:administratorId/newAssignmentTemplates', InsertNewAssignmentTemplateController ],
  [ 'get', '/:administratorId/newAssignmentTemplates/:assignmentId', GetNewAssignmentTemplateController ],
  [ 'put', '/:administratorId/newAssignmentTemplates/:assignmentId', SaveNewAssignmentTemplateController ],
  [ 'delete', '/:administratorId/newAssignmentTemplates/:assignmentId', DeleteNewAssignmentTemplateController ],
  // new assignment media
  [ 'post', '/:administratorId/newAssignmentMedia', InsertNewAssignmentMediumController, multer().single('file') ],
  [ 'get', '/:administratorId/newAssignmentMedia/:mediumId', GetNewAssignmentMediumController ],
  [ 'put', '/:administratorId/newAssignmentMedia/:mediumId', SaveNewAssignmentMediumController ],
  [ 'delete', '/:administratorId/newAssignmentMedia/:mediumId', DeleteNewAssignmentMediumController ],
  [ 'get', '/:administratorId/newAssignmentMedia/:mediumId/file', DownloadNewAssignmentMediumController ],
  // new part templates
  [ 'post', '/:administratorId/newPartTemplates', InsertNewPartTemplateController ],
  [ 'get', '/:administratorId/newPartTemplates/:partId', GetNewPartTemplateController ],
  [ 'put', '/:administratorId/newPartTemplates/:partId', SaveNewPartTemplateController ],
  [ 'delete', '/:administratorId/newPartTemplates/:partId', DeleteNewPartTemplateController ],
  // new text box templates
  [ 'post', '/:administratorId/newTextBoxTemplates', InsertNewTextBoxTemplateController ],
  [ 'get', '/:administratorId/newTextBoxTemplates/:textBoxId', GetNewTextBoxTemplateController ],
  [ 'put', '/:administratorId/newTextBoxTemplates/:textBoxId', SaveNewTextBoxTemplateController ],
  [ 'delete', '/:administratorId/newTextBoxTemplates/:textBoxId', DeleteNewTextBoxTemplateController ],
  // new upload slot templates
  [ 'post', '/:administratorId/newUploadSlotTemplates', InsertNewUploadSlotTemplateController ],
  [ 'get', '/:administratorId/newUploadSlotTemplates/:uploadSlotId', GetNewUploadSlotTemplateController ],
  [ 'put', '/:administratorId/newUploadSlotTemplates/:uploadSlotId', SaveNewUploadSlotTemplateController ],
  [ 'delete', '/:administratorId/newUploadSlotTemplates/:uploadSlotId', DeleteNewUploadSlotTemplateController ],
  // new part media
  [ 'post', '/:administratorId/newPartMedia', InsertNewPartMediumController, multer().single('file') ],
  [ 'get', '/:administratorId/newPartMedia/:mediumId', GetNewPartMediumController ],
  [ 'put', '/:administratorId/newPartMedia/:mediumId', SaveNewPartMediumController ],
  [ 'delete', '/:administratorId/newPartMedia/:mediumId', DeleteNewPartMediumController ],
  [ 'get', '/:administratorId/newPartMedia/:mediumId/file', DownloadNewPartMediumController ],
  // new unit template prices
  [ 'get', '/:administratorId/courses/:courseId/newUnitTemplatePrices', GetNewUnitTemplatePricesController ],
  [ 'put', '/:administratorId/courses/:courseId/newUnitTemplatePrices', ReplaceNewUnitTemplatePricesController ],
  [ 'delete', '/:administratorId/courses/:courseId/newUnitTemplatePrices', DeleteNewUnitTemplatePricesController ],
  // new unit returns
  [ 'get', '/:administratorId/newUnitReturns/:unitReturnId', GetNewUnitReturnController ],
  [ 'put', '/:administratorId/newUnitReturns/:unitReturnId', CloseNewUnitReturnController ],
  // new material units
  [ 'get', '/:administratorId/newMaterialUnits/:materialUnitId', GetNewMaterialUnitController ],
  [ 'post', '/:administratorId/newMaterialUnits', InsertNewMaterialUnitController ],
  // new materials
  // [ 'get', '/:administratorId/newMaterials', GetAllNewMaterialsController ],
  [ 'post', '/:administratorId/newMaterials', InsertNewMaterialController, multer({ dest: '/tmp/' }).fields([ { name: 'content', maxCount: 1 }, { name: 'image', maxCount: 1 } ]) ],
  [ 'get', '/:administratorId/newMaterials/:materialId', GetNewMaterialController ],
  [ 'put', '/:administratorId/newMaterials/:materialId', SaveNewMaterialController ],
  [ 'post', '/:administratorId/newMaterials/:materialId/file', ReplaceNewMaterialFileController, multer({ dest: '/tmp/' }).single('file') ],
  [ 'delete', '/:administratorId/newMaterials/:materialId', DeleteNewMaterialController ],
];

applyRoutes(administratorRouter, routes);
