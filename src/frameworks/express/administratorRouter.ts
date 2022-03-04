import { Router } from 'express';

import { AdministratorGuardMiddleware } from '../../controllers/administrators/administratorGuardMiddleware';
import { DeleteNewTextBoxTemplateController } from '../../controllers/administrators/deleteNewTextBoxTemplateController';
import { GetCourseController } from '../../controllers/administrators/getCourseController';
import { GetNewAssignmentTemplateController } from '../../controllers/administrators/getNewAssignmentTemplateController';
import { GetNewPartTemplateController } from '../../controllers/administrators/getNewPartTemplateController';
import { GetNewTextBoxTemplateController } from '../../controllers/administrators/getNewTextBoxTemplateController';
import { GetNewUnitTemplateController } from '../../controllers/administrators/getNewUnitTemplateController';
import { GetNewUploadSlotTemplateController } from '../../controllers/administrators/getNewUploadSlotTemplateController';
import { GetSchoolController } from '../../controllers/administrators/getSchoolController';
import { GetSchoolsController } from '../../controllers/administrators/getSchoolsController';
import { InsertNewTextBoxTemplateController } from '../../controllers/administrators/insertNewTextBoxTemplateController';
import { InsertNewUploadSlotTemplateController } from '../../controllers/administrators/insertNewUploadSlotTemplateController';
import { SaveNewTextBoxTemplateController } from '../../controllers/administrators/saveNewTextBoxTemplateController';
import { SaveNewUploadSlotTemplateController } from '../../controllers/administrators/saveNewUploadSlotTemplateController';
import { asyncWrapper } from './asyncWrapper';

export const administratorRouter = Router();

administratorRouter.use('/:administratorId', asyncWrapper(async (req, res, next) => {
  const middleware = new AdministratorGuardMiddleware(req, res, next);
  await middleware.execute();
}));

administratorRouter.get('/:administratorId/schools', asyncWrapper(async (req, res) => {
  const controller = new GetSchoolsController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId', asyncWrapper(async (req, res) => {
  const controller = new GetSchoolController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId', asyncWrapper(async (req, res) => {
  const controller = new GetCourseController(req, res);
  await controller.execute();
}));

// new unit templates

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUnitTemplateController(req, res);
  await controller.execute();
}));

// new assignment templates

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId', asyncWrapper(async (req, res) => {
  const controller = new GetNewAssignmentTemplateController(req, res);
  await controller.execute();
}));

// new part templates

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId', asyncWrapper(async (req, res) => {
  const controller = new GetNewPartTemplateController(req, res);
  await controller.execute();
}));

// new text box templates

administratorRouter.post('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes', asyncWrapper(async (req, res) => {
  const controller = new InsertNewTextBoxTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', asyncWrapper(async (req, res) => {
  const controller = new GetNewTextBoxTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.put('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', asyncWrapper(async (req, res) => {
  const controller = new SaveNewTextBoxTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.delete('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', asyncWrapper(async (req, res) => {
  const controller = new DeleteNewTextBoxTemplateController(req, res);
  await controller.execute();
}));

// new upload slot templates

administratorRouter.post('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots', asyncWrapper(async (req, res) => {
  const controller = new InsertNewUploadSlotTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUploadSlotTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.put('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', asyncWrapper(async (req, res) => {
  const controller = new SaveNewUploadSlotTemplateController(req, res);
  await controller.execute();
}));
