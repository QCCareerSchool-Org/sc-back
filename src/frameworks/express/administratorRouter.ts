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
import { SaveNewAssignmentTemplateController } from '../../controllers/administrators/saveNewAssignmentTemplateController';
import { SaveNewPartTemplateController } from '../../controllers/administrators/saveNewPartTemplateController';
import { SaveNewTextBoxTemplateController } from '../../controllers/administrators/saveNewTextBoxTemplateController';
import { SaveNewUnitTemplateController } from '../../controllers/administrators/saveNewUnitTemplateController';
import { SaveNewUploadSlotTemplateController } from '../../controllers/administrators/saveNewUploadSlotTemplateController';
import { asyncWrapper } from './asyncWrapper';

export const administratorRouter = Router();

administratorRouter.use(
  '/:administratorId',
  asyncWrapper(async (req, res, next) => new AdministratorGuardMiddleware(req, res, next).execute()),
);
administratorRouter.get(
  '/:administratorId/schools',
  asyncWrapper(async (req, res) => new GetAllSchoolsController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId',
  asyncWrapper(async (req, res) => new GetSchoolController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId',
  asyncWrapper(async (req, res) => new GetCourseController(req, res).execute()),
);

// new unit templates
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates',
  asyncWrapper(async (req, res) => new InsertNewUnitTemplateController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId',
  asyncWrapper(async (req, res) => new GetNewUnitTemplateController(req, res).execute()),
);
administratorRouter.put(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId',
  asyncWrapper(async (req, res) => new SaveNewUnitTemplateController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId',
  asyncWrapper(async (req, res) => new DeleteNewUnitTemplateController(req, res).execute()),
);

// new assignment templates
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments',
  asyncWrapper(async (req, res) => new InsertNewAssignmentTemplateController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new GetNewAssignmentTemplateController(req, res).execute()),
);
administratorRouter.put(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new SaveNewAssignmentTemplateController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new DeleteNewAssignmentTemplateController(req, res).execute()),
);

// new assignment media
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/media',
  multer().single('file'),
  asyncWrapper(async (req, res) => new InsertNewAssignmentMediumController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/media/:mediumId',
  asyncWrapper(async (req, res) => new GetNewAssignmentMediumController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/media/:mediumId',
  asyncWrapper(async (req, res) => new DeleteNewAssignmentMediumController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/media/:mediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewAssignmentMediumController(req, res).execute()),
);

// new part templates
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts',
  asyncWrapper(async (req, res) => new InsertNewPartTemplateController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId',
  asyncWrapper(async (req, res) => new GetNewPartTemplateController(req, res).execute()),
);
administratorRouter.put(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId',
  asyncWrapper(async (req, res) => new SaveNewPartTemplateController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId',
  asyncWrapper(async (req, res) => new DeleteNewPartTemplateController(req, res).execute()),
);

// new text box templates
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes',
  asyncWrapper(async (req, res) => new InsertNewTextBoxTemplateController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new GetNewTextBoxTemplateController(req, res).execute()),
);
administratorRouter.put(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new SaveNewTextBoxTemplateController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new DeleteNewTextBoxTemplateController(req, res).execute()),
);

// new upload slot templates
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots',
  asyncWrapper(async (req, res) => new InsertNewUploadSlotTemplateController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new GetNewUploadSlotTemplateController(req, res).execute()),
);
administratorRouter.put(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new SaveNewUploadSlotTemplateController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new DeleteNewUploadSlotTemplateController(req, res).execute()),
);

// new part media
administratorRouter.post(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/media',
  multer().single('file'),
  asyncWrapper(async (req, res) => new InsertNewPartMediumController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/media/:mediumId',
  asyncWrapper(async (req, res) => new GetNewPartMediumController(req, res).execute()),
);
administratorRouter.delete(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/media/:mediumId',
  asyncWrapper(async (req, res) => new DeleteNewPartMediumController(req, res).execute()),
);
administratorRouter.get(
  '/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/media/:mediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewPartMediumController(req, res).execute()),
);
