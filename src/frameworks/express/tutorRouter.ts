import { Router } from 'express';
import multer from 'multer';

import { CloseNewUnitController } from '../../controllers/tutors/closeNewUnitController';
import { DownloadNewUnitFeedbackController } from '../../controllers/tutors/downloadNewAssignmentFeedbackController';
import { EraseNewUnitFeedbackController } from '../../controllers/tutors/eraseNewAssignmentFeedbackController';
import { GetNewAssignmentController } from '../../controllers/tutors/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/tutors/getNewUnitController';
import { ReturnNewUnitController } from '../../controllers/tutors/returnNewUnitController';
import { SaveNewTextBoxMarkController } from '../../controllers/tutors/saveNewTextBoxMarkController';
import { TutorGuardMiddleware } from '../../controllers/tutors/tutorGuardMiddleware';
import { UploadNewUnitFeedbackController } from '../../controllers/tutors/uploadNewAssignmentFeedbackController';
import { asyncWrapper } from './asyncWrapper';

export const tutorRouter = Router();

tutorRouter.use(
  '/:tutorId',
  asyncWrapper(async (req, res, next) => new TutorGuardMiddleware(req, res, next).execute()),
);

// units
tutorRouter.get(
  '/:tutorId/students/:studentId/newUnits/:unitId',
  asyncWrapper(async (req, res) => new GetNewUnitController(req, res).execute()),
);
tutorRouter.post(
  '/:tutorId/students/:studentId/newUnits/:unitId/returns',
  asyncWrapper(async (req, res) => new ReturnNewUnitController(req, res).execute()),
);
tutorRouter.post(
  '/:tutorId/students/:studentId/newUnits/:unitId/closes',
  asyncWrapper(async (req, res) => new CloseNewUnitController(req, res).execute()),
);
tutorRouter.get(
  '/:tutorId/students/:studentId/newUnits/:unitId/response',
  asyncWrapper(async (req, res) => new DownloadNewUnitFeedbackController(req, res).execute()),
);
tutorRouter.put(
  '/:tutorId/students/:studentId/newUnits/:unitId/response',
  multer().single('file'),
  asyncWrapper(async (req, res) => new UploadNewUnitFeedbackController(req, res).execute()),
);
tutorRouter.delete(
  '/:tutorId/students/:studentId/newUnits/:unitId/response',
  asyncWrapper(async (req, res) => new EraseNewUnitFeedbackController(req, res).execute()),
);

// assignments
tutorRouter.get(
  '/:tutorId/students/:studentId/newUnits/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new GetNewAssignmentController(req, res).execute()),
);

// text boxes
tutorRouter.put(
  '/:tutorId/newTextBoxes/:textBoxId/mark',
  asyncWrapper(async (req, res) => new SaveNewTextBoxMarkController(req, res).execute()),
);
