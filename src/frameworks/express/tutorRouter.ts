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
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';
import { asyncWrapper } from './asyncWrapper';

export const tutorRouter = Router();

tutorRouter.use(
  '/:tutorId',
  asyncWrapper(async (req, res, next) => new TutorGuardMiddleware(req, res, next).execute()),
);

const routes: Route[] = [
  [ 'get', '/:tutorId/students/:studentId/newUnits/:unitId', GetNewUnitController ],
  [ 'post', '/:tutorId/students/:studentId/newUnits/:unitId/returns', ReturnNewUnitController ],
  [ 'post', '/:tutorId/students/:studentId/newUnits/:unitId/closes', CloseNewUnitController ],
  [ 'get', '/:tutorId/students/:studentId/newUnits/:unitId/response', DownloadNewUnitFeedbackController ],
  [ 'put', '/:tutorId/students/:studentId/newUnits/:unitId/response', UploadNewUnitFeedbackController, multer().single('file') ],
  [ 'delete', '/:tutorId/students/:studentId/newUnits/:unitId/response', EraseNewUnitFeedbackController ],
  [ 'get', '/:tutorId/students/:studentId/newUnits/:unitId/assignments/:assignmentId', GetNewAssignmentController ],
  [ 'patch', '/:tutorId/newTextBoxes/:textBoxId', SaveNewTextBoxController ],
  [ 'patch', '/:tutorId/newUploadSlots/:uploadSlotId', SaveNewUploadSlotController ],
  [ 'get', '/:tutorId/newUploadSlots/:uploadSlotId/file', DownloadNewUploadSlotController ],
  [ 'get', '/:tutorId/newAssignmentMedia/:assignmentMediumId/file', DownloadNewAssignmentMediumController ],
  [ 'get', '/:tutorId/newPartMedia/:partMediumId/file', DownloadNewPartMediumController ],
];

applyRoutes(tutorRouter, routes);
