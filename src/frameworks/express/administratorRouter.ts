import { Router } from 'express';
import multer from 'multer';

import { AdministratorGuardMiddleware } from '../../controllers/administrators/administratorGuardMiddleware';
import { DeleteNewAssignmentMediumController } from '../../controllers/administrators/deleteNewAssignmentMediumController';
import { DeleteNewAssignmentTemplateController } from '../../controllers/administrators/deleteNewAssignmentTemplateController';
import { DeleteNewPartMediumController } from '../../controllers/administrators/deleteNewPartMediumController';
import { DeleteNewPartTemplateController } from '../../controllers/administrators/deleteNewPartTemplateController';
import { DeleteNewTextBoxTemplateController } from '../../controllers/administrators/deleteNewTextBoxTemplateController';
import { DeleteNewUnitTemplateController } from '../../controllers/administrators/deleteNewUnitTemplateController';
import { DeleteNewUploadSlotTemplateController } from '../../controllers/administrators/deleteNewUploadSlotTemplateController';
import { DownloadNewAssignmentMediumController } from '../../controllers/administrators/downloadNewAssignmentMediumController';
import { DownloadNewPartMediumController } from '../../controllers/administrators/downloadNewPartMediumController';
import { EnableCourseController } from '../../controllers/administrators/enableCourseController';
import { GetAllCountriesController } from '../../controllers/administrators/getAllCountriesController';
import { GetAllCoursesController } from '../../controllers/administrators/getAllCoursesController';
import { GetAllCurrenciesController } from '../../controllers/administrators/getAllCurrenciesController';
import { GetAllSchoolsController } from '../../controllers/administrators/getAllSchoolsController';
import { GetCourseController } from '../../controllers/administrators/getCourseController';
import { GetNewAssignmentMediumController } from '../../controllers/administrators/getNewAssignmentMediumController';
import { GetNewAssignmentTemplateController } from '../../controllers/administrators/getNewAssignmentTemplateController';
import { GetNewPartMediumController } from '../../controllers/administrators/getNewPartMediumController';
import { GetNewPartTemplateController } from '../../controllers/administrators/getNewPartTemplateController';
import { GetNewTextBoxTemplateController } from '../../controllers/administrators/getNewTextBoxTemplateController';
import { GetNewUnitTemplateController } from '../../controllers/administrators/getNewUnitTemplateController';
import { GetNewUploadSlotTemplateController } from '../../controllers/administrators/getNewUploadSlotTemplateController';
import { GetSchoolController } from '../../controllers/administrators/getSchoolController';
import { InsertNewAssignmentMediumController } from '../../controllers/administrators/insertNewAssignmentMediumController';
import { InsertNewAssignmentTemplateController } from '../../controllers/administrators/insertNewAssignmentTemplateController';
import { InsertNewPartMediumController } from '../../controllers/administrators/insertNewPartMediumController';
import { InsertNewPartTemplateController } from '../../controllers/administrators/insertNewPartTemplateController';
import { InsertNewTextBoxTemplateController } from '../../controllers/administrators/insertNewTextBoxTemplateController';
import { InsertNewUnitTemplateController } from '../../controllers/administrators/insertNewUnitTemplateController';
import { InsertNewUploadSlotTemplateController } from '../../controllers/administrators/insertNewUploadSlotTemplateController';
import { SaveNewAssignmentMediumController } from '../../controllers/administrators/saveNewAssignmentMediumController';
import { SaveNewAssignmentTemplateController } from '../../controllers/administrators/saveNewAssignmentTemplateController';
import { SaveNewPartMediumController } from '../../controllers/administrators/saveNewPartMediumController';
import { SaveNewPartTemplateController } from '../../controllers/administrators/saveNewPartTemplateController';
import { SaveNewTextBoxTemplateController } from '../../controllers/administrators/saveNewTextBoxTemplateController';
import { SaveNewUnitTemplateController } from '../../controllers/administrators/saveNewUnitTemplateController';
import { SaveNewUploadSlotTemplateController } from '../../controllers/administrators/saveNewUploadSlotTemplateController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';
import { asyncWrapper } from './asyncWrapper';

export const administratorRouter = Router();

administratorRouter.use(
  '/:administratorId',
  asyncWrapper(async (req, res, next) => new AdministratorGuardMiddleware(req, res, next).execute()),
);

const routes: Route[] = [
  // schools
  [ 'get', '/:administratorId/schools', GetAllSchoolsController ],
  [ 'get', '/:administratorId/schools/:schoolId', GetSchoolController ],
  // courses
  [ 'get', '/:administratorId/courses', GetAllCoursesController ],
  [ 'get', '/:administratorId/courses/:courseId', GetCourseController ],
  [ 'post', '/:administratorId/courses/:courseId/enable', EnableCourseController ],
  // countries
  [ 'get', '/:administratorId/countries', GetAllCountriesController ],
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
];

applyRoutes(administratorRouter, routes);
