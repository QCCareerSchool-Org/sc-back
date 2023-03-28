import { Router } from 'express';
import multer from 'multer';

import { AdministratorGuardMiddleware } from '../../controllers/administrators/administratorGuardMiddleware.js';
import { CloseNewSubmissionReturnController } from '../../controllers/administrators/closeNewSubmissionReturnController.js';
import { DeleteAllNewSubmissionsController } from '../../controllers/administrators/deleteAllNewSubmissionsController.js';
import { DeleteEnrollmentController } from '../../controllers/administrators/deleteEnrollmentController.js';
import { DeleteMaterialController } from '../../controllers/administrators/deleteMaterialController.js';
import { DeleteMaterialImageController } from '../../controllers/administrators/deleteMaterialImageController.js';
import { DeleteNewAssignmentMediumController } from '../../controllers/administrators/deleteNewAssignmentMediumController.js';
import { DeleteNewAssignmentTemplateController } from '../../controllers/administrators/deleteNewAssignmentTemplateController.js';
import { DeleteNewPartMediumController } from '../../controllers/administrators/deleteNewPartMediumController.js';
import { DeleteNewPartTemplateController } from '../../controllers/administrators/deleteNewPartTemplateController.js';
import { DeleteNewSubmissionTemplateController } from '../../controllers/administrators/deleteNewSubmissionTemplateController.js';
import { DeleteNewSubmissionTemplatePricesController } from '../../controllers/administrators/deleteNewSubmissionTemplatePricesController.js';
import { DeleteNewTextBoxTemplateController } from '../../controllers/administrators/deleteNewTextBoxTemplateController.js';
import { DeleteNewUploadSlotTemplateController } from '../../controllers/administrators/deleteNewUploadSlotTemplateController.js';
import { DeleteUnitController } from '../../controllers/administrators/deleteUnitController.js';
import { DownloadMaterialImageController } from '../../controllers/administrators/downloadMaterialImageController.js';
import { DownloadNewAssignmentMediumController } from '../../controllers/administrators/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/administrators/downloadNewPartMediumController.js';
import { DownloadNewSubmissionFeedbackController } from '../../controllers/administrators/downloadNewSubmissionFeedbackController.js';
import { DownloadNewUploadSlotController } from '../../controllers/administrators/downloadNewUploadSlotController.js';
import { EnableCourseController } from '../../controllers/administrators/enableCourseController.js';
import { GetAllCountriesController } from '../../controllers/administrators/getAllCountriesController.js';
import { GetAllCoursesController } from '../../controllers/administrators/getAllCoursesController.js';
import { GetAllCurrenciesController } from '../../controllers/administrators/getAllCurrenciesController.js';
import { GetAllSchoolsController } from '../../controllers/administrators/getAllSchoolsController.js';
import { GetCountryController } from '../../controllers/administrators/getCountryController.js';
import { GetCourseController } from '../../controllers/administrators/getCourseController.js';
import { GetMaterialController } from '../../controllers/administrators/getMaterialController.js';
import { GetNewAssignmentController } from '../../controllers/administrators/getNewAssignmentController.js';
import { GetNewAssignmentMediumController } from '../../controllers/administrators/getNewAssignmentMediumController.js';
import { GetNewAssignmentTemplateController } from '../../controllers/administrators/getNewAssignmentTemplateController.js';
import { GetNewPartMediumController } from '../../controllers/administrators/getNewPartMediumController.js';
import { GetNewPartTemplateController } from '../../controllers/administrators/getNewPartTemplateController.js';
import { GetNewSubmissionController } from '../../controllers/administrators/getNewSubmissionController.js';
import { GetNewTextBoxTemplateController } from '../../controllers/administrators/getNewTextBoxTemplateController.js';
import { GetNewSubmissionReturnController } from '../../controllers/administrators/getNewUnitReturnController.js';
import { GetNewSubmissionTemplateController } from '../../controllers/administrators/getNewUnitTemplateController.js';
import { GetNewSubmissionTemplatePricesController } from '../../controllers/administrators/getNewUnitTemplatePricesController.js';
import { GetNewUploadSlotTemplateController } from '../../controllers/administrators/getNewUploadSlotTemplateController.js';
import { GetSchoolController } from '../../controllers/administrators/getSchoolController.js';
import { GetStudentController } from '../../controllers/administrators/getStudentController.js';
import { GetUnitController } from '../../controllers/administrators/getUnitController.js';
import { InsertMaterialController } from '../../controllers/administrators/insertMaterialController.js';
import { InsertNewAssignmentMediumController } from '../../controllers/administrators/insertNewAssignmentMediumController.js';
import { InsertNewAssignmentTemplateController } from '../../controllers/administrators/insertNewAssignmentTemplateController.js';
import { InsertNewPartMediumController } from '../../controllers/administrators/insertNewPartMediumController.js';
import { InsertNewPartTemplateController } from '../../controllers/administrators/insertNewPartTemplateController.js';
import { InsertNewSubmissionTemplateController } from '../../controllers/administrators/insertNewSubmissionTemplateController.js';
import { InsertNewTextBoxTemplateController } from '../../controllers/administrators/insertNewTextBoxTemplateController.js';
import { InsertNewUploadSlotTemplateController } from '../../controllers/administrators/insertNewUploadSlotTemplateController.js';
import { InsertUnitController } from '../../controllers/administrators/insertUnitController.js';
import { ReplaceMaterialContentController } from '../../controllers/administrators/replaceMaterialContentController.js';
import { ReplaceMaterialImageController } from '../../controllers/administrators/replaceMaterialImageController.js';
import { ReplaceNewSubmissionTemplatePricesController } from '../../controllers/administrators/replaceNewSubmissionTemplatePricesController.js';
import { SaveMaterialController } from '../../controllers/administrators/saveMaterialController.js';
import { SaveNewAssignmentMediumController } from '../../controllers/administrators/saveNewAssignmentMediumController.js';
import { SaveNewAssignmentTemplateController } from '../../controllers/administrators/saveNewAssignmentTemplateController.js';
import { SaveNewPartMediumController } from '../../controllers/administrators/saveNewPartMediumController.js';
import { SaveNewPartTemplateController } from '../../controllers/administrators/saveNewPartTemplateController.js';
import { SaveNewSubmissionTemplateController } from '../../controllers/administrators/saveNewSubmissionTemplateController.js';
import { SaveNewTextBoxController } from '../../controllers/administrators/saveNewTextBoxController.js';
import { SaveNewTextBoxTemplateController } from '../../controllers/administrators/saveNewTextBoxTemplateController.js';
import { SaveNewUploadSlotTemplateController } from '../../controllers/administrators/saveNewUploadSlotTemplateController.js';
import { SaveUnitController } from '../../controllers/administrators/saveUnitController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const administratorRouter = Router();

const routes: Route[] = [
  // only the administrator in question should be able to access this path
  [ 'use', '/:administratorId', AdministratorGuardMiddleware ],
  // student
  [ 'get', '/:administratorId/students/:studentId', GetStudentController ],
  // enrollment
  [ 'delete', '/:administratorId/enrollments/:enrollmentId', DeleteEnrollmentController ],
  [ 'delete', '/:administratorId/enrollments/:enrollmentId/submissions', DeleteAllNewSubmissionsController ],
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
  // new submission templates
  [ 'post', '/:administratorId/newSubmissionTemplates', InsertNewSubmissionTemplateController ],
  [ 'get', '/:administratorId/newSubmissionTemplates/:submissionId', GetNewSubmissionTemplateController ],
  [ 'put', '/:administratorId/newSubmissionTemplates/:submissionId', SaveNewSubmissionTemplateController ],
  [ 'delete', '/:administratorId/newSubmissionTemplates/:submissionId', DeleteNewSubmissionTemplateController ],
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
  // new submission template prices
  [ 'get', '/:administratorId/courses/:courseId/newSubmissionTemplatePrices', GetNewSubmissionTemplatePricesController ],
  [ 'put', '/:administratorId/courses/:courseId/newSubmissionTemplatePrices', ReplaceNewSubmissionTemplatePricesController ],
  [ 'delete', '/:administratorId/courses/:courseId/newSubmissionTemplatePrices', DeleteNewSubmissionTemplatePricesController ],
  // new submissions
  [ 'get', '/:administratorId/newSubmissions/:submissionId', GetNewSubmissionController ],
  [ 'get', '/:administratorId/newSubmissions/:submissionId/feedback', DownloadNewSubmissionFeedbackController ],
  // new assignments
  [ 'get', '/:administratorId/newAssignments/:assignmentId', GetNewAssignmentController ],
  // new text boxes
  [ 'put', '/:administratorId/newTextBoxes/:textBoxId', SaveNewTextBoxController ],
  // upload slots
  [ 'get', '/:administratorId/newUploadSlots/:uploadSlotId/file', DownloadNewUploadSlotController ],
  // [ 'put', '/:administratorId/newUploadSlots/:uploadSlotId', SaveNewUploadSlotController ],
  // new submission returns
  [ 'get', '/:administratorId/newSubmissionReturns/:submissionReturnId', GetNewSubmissionReturnController ],
  [ 'put', '/:administratorId/newSubmissionReturns/:submissionReturnId', CloseNewSubmissionReturnController ],
  // units
  [ 'post', '/:administratorId/units', InsertUnitController ],
  [ 'get', '/:administratorId/units/:unitId', GetUnitController ],
  [ 'put', '/:administratorId/units/:unitId', SaveUnitController ],
  [ 'delete', '/:administratorId/units/:unitId', DeleteUnitController ],
  // materials
  // [ 'get', '/:administratorId/materials', GetAllNewMaterialsController ],
  [ 'post', '/:administratorId/materials', InsertMaterialController, multer({ dest: '/tmp/web/' }).fields([ { name: 'content', maxCount: 1 }, { name: 'image', maxCount: 1 } ]) ],
  [ 'get', '/:administratorId/materials/:materialId', GetMaterialController ],
  [ 'put', '/:administratorId/materials/:materialId', SaveMaterialController ],
  [ 'delete', '/:administratorId/materials/:materialId', DeleteMaterialController ],
  [ 'get', '/:administratorId/materials/:materialId/image', DownloadMaterialImageController ],
  [ 'put', '/:administratorId/materials/:materialId/image', ReplaceMaterialImageController, multer({ dest: '/tmp/web/' }).single('image') ],
  [ 'delete', '/:administratorId/materials/:materialId/image', DeleteMaterialImageController ],
  [ 'put', '/:administratorId/materials/:materialId/content', ReplaceMaterialContentController, multer({ dest: '/tmp/web/' }).single('content') ],
];

applyRoutes(administratorRouter, routes);
