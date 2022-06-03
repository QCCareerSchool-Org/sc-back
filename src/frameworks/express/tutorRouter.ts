import { Router } from 'express';
import multer from 'multer';

import { CloseNewUnitController } from '../../controllers/tutors/closeNewUnitController.js';
import { DownloadNewUnitFeedbackController } from '../../controllers/tutors/downloadNewAssignmentFeedbackController.js';
import { DownloadNewAssignmentMediumController } from '../../controllers/tutors/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/tutors/downloadNewPartMediumController.js';
import { DownloadNewUploadSlotController } from '../../controllers/tutors/downloadNewUploadSlotController.js';
import { EraseNewUnitFeedbackController } from '../../controllers/tutors/eraseNewAssignmentFeedbackController.js';
import { GetNewAssignmentController } from '../../controllers/tutors/getNewAssignmentController.js';
import { GetNewUnitController } from '../../controllers/tutors/getNewUnitController.js';
import { ReturnNewUnitController } from '../../controllers/tutors/returnNewUnitController.js';
import { SaveNewTextBoxController } from '../../controllers/tutors/saveNewTextBoxController.js';
import { SaveNewUploadSlotController } from '../../controllers/tutors/saveNewUploadSlotController.js';
import { TutorGuardMiddleware } from '../../controllers/tutors/tutorGuardMiddleware.js';
import { UploadNewUnitFeedbackController } from '../../controllers/tutors/uploadNewAssignmentFeedbackController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const tutorRouter = Router();

const routes: Route[] = [
  // only the tutor in question, or any administrator, should be able to access this path
  [ 'use', '/:tutorId', TutorGuardMiddleware ],
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
