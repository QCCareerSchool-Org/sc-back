import { Router } from 'express';

import { GetNewAssignmentController } from '../../controllers/tutors/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/tutors/getNewUnitController';
import { TutorGuardMiddleware } from '../../controllers/tutors/tutorGuardMiddleware';
import { asyncWrapper } from './asyncWrapper';

export const tutorRouter = Router();

tutorRouter.use(
  '/:tutorId',
  asyncWrapper(async (req, res, next) => new TutorGuardMiddleware(req, res, next).execute()),
);
tutorRouter.get(
  '/:tutorId/students/:studentId/newUnits/:unitId',
  asyncWrapper(async (req, res) => new GetNewUnitController(req, res).execute()),
);
tutorRouter.get(
  '/:tutorId/students/:studentId/newUnits/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new GetNewAssignmentController(req, res).execute()),
);
