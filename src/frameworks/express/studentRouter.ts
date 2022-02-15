import { Router } from 'express';
import { GetAllNewUnitsController } from '../../controllers/student/getAllNewUnitsController';
import { GetNewAssignmentController } from '../../controllers/student/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/student/getNewUnitController';
import { StudentGuardMiddleware } from '../../controllers/student/studentGuardMiddleware';

import { asyncWrapper } from './asyncWrapper';

export const studentRouter = Router();

studentRouter.use('/:studentId', asyncWrapper(async (req, res, next) => {
  const middleware = new StudentGuardMiddleware(req, res, next);
  await middleware.execute();
}));

studentRouter.get('/:studentId/newUnits', asyncWrapper(async (req, res) => {
  const controller = new GetAllNewUnitsController(req, res);
  await controller.execute();
}));

studentRouter.get('/:studentId/newUnits/:unitId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUnitController(req, res);
  await controller.execute();
}));

studentRouter.get('/:studentId/newUnits/:unitId/assignments/:assignmentId', asyncWrapper(async (req, res) => {
  const controller = new GetNewAssignmentController(req, res);
  await controller.execute();
}));
