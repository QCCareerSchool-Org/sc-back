import { Router } from 'express';

import { AdministratorGuardMiddleware } from '../../controllers/administrators/administratorGuardMiddleware';
import { GetCourseController } from '../../controllers/administrators/getCourseController';
import { GetNewAssignmentTemplateController } from '../../controllers/administrators/getNewAssignmentTemplateController';
import { GetNewPartTemplateController } from '../../controllers/administrators/getNewPartTemplateController';
import { GetNewTextBoxTemplateController } from '../../controllers/administrators/getNewTextBoxTemplateController';
import { GetNewUnitTemplateController } from '../../controllers/administrators/getNewUnitTemplateController';
import { GetNewUploadSlotTemplateController } from '../../controllers/administrators/getNewUploadSlotTemplateController';
import { GetSchoolController } from '../../controllers/administrators/getSchoolController';
import { GetSchoolsController } from '../../controllers/administrators/getSchoolsController';
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

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUnitTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId', asyncWrapper(async (req, res) => {
  const controller = new GetNewAssignmentTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId', asyncWrapper(async (req, res) => {
  const controller = new GetNewPartTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', asyncWrapper(async (req, res) => {
  const controller = new GetNewTextBoxTemplateController(req, res);
  await controller.execute();
}));

administratorRouter.get('/:administratorId/schools/:schoolId/courses/:courseId/newUnitTemplates/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUploadSlotTemplateController(req, res);
  await controller.execute();
}));
