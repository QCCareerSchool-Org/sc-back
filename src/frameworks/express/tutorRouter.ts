import { Router } from 'express';
import multer from 'multer';

import { CloseNewUnitController } from '../../controllers/tutors/closeNewUnitController';
import { DownloadNewUnitFeedbackController } from '../../controllers/tutors/downloadNewAssignmentFeedbackController';
import { DownloadNewAssignmentMediumController } from '../../controllers/tutors/downloadNewAssignmentMediumController';
import { DownloadNewPartMediumController } from '../../controllers/tutors/downloadNewPartMediumController';
import { DownloadNewUploadSlotController } from '../../controllers/tutors/downloadNewUploadSlotController';
import { EraseNewUnitFeedbackController } from '../../controllers/tutors/eraseNewAssignmentFeedbackController';
import { GetNewAssignmentController } from '../../controllers/tutors/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/tutors/getNewUnitController';
import { ReturnNewUnitController } from '../../controllers/tutors/returnNewUnitController';
import { SaveNewTextBoxController } from '../../controllers/tutors/saveNewTextBoxController';
import { SaveNewUploadSlotController } from '../../controllers/tutors/saveNewUploadSlotController';
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
tutorRouter.patch(
  '/:tutorId/newTextBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new SaveNewTextBoxController(req, res).execute()),
);

// upload slots
tutorRouter.patch(
  '/:tutorId/newUploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new SaveNewUploadSlotController(req, res).execute()),
);

tutorRouter.get(
  '/:tutorId/newUploadSlots/:uploadSlotId/file',
  asyncWrapper(async (req, res) => new DownloadNewUploadSlotController(req, res).execute()),
);

// assignment media
tutorRouter.get(
  '/:tutorId/newAssignmentMedia/:assignmentMediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewAssignmentMediumController(req, res).execute()),
);

// part media
tutorRouter.get(
  '/:tutorId/newPartMedia/:partMediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewPartMediumController(req, res).execute()),
);
