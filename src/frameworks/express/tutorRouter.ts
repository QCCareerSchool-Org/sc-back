import { Router } from 'express';
import multer from 'multer';

import { CloseNewSubmissionController } from '../../controllers/tutors/closeNewSubmissionController.js';
import { DownloadNewAssignmentMediumController } from '../../controllers/tutors/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/tutors/downloadNewPartMediumController.js';
import { DownloadNewSubmissionFeedbackController } from '../../controllers/tutors/downloadNewSubmissionFeedbackController.js';
import { DownloadNewUploadSlotController } from '../../controllers/tutors/downloadNewUploadSlotController.js';
import { EraseNewSubmissionFeedbackController } from '../../controllers/tutors/eraseNewSubmissionFeedbackController.js';
import { GetNewAssignmentController } from '../../controllers/tutors/getNewAssignmentController.js';
import { GetNewSubmissionController } from '../../controllers/tutors/getNewSubmissionController.js';
import { ReturnNewSubmissionController } from '../../controllers/tutors/returnNewSubmissionController.js';
import { SaveNewTextBoxController } from '../../controllers/tutors/saveNewTextBoxController.js';
import { SaveNewUploadSlotController } from '../../controllers/tutors/saveNewUploadSlotController.js';
import { SaveTutorNoteController } from '../../controllers/tutors/saveTutorNoteController.js';
import { TutorGuardMiddleware } from '../../controllers/tutors/tutorGuardMiddleware.js';
import { UploadNewSubmissionFeedbackController } from '../../controllers/tutors/uploadNewSubmissionFeedbackController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const tutorRouter = Router();

const routes: Route[] = [
  // only the tutor in question, or any administrator, should be able to access this path
  [ 'use', '/:tutorId', TutorGuardMiddleware ],
  [ 'get', '/:tutorId/students/:studentId/newSubmissions/:submissionId', GetNewSubmissionController ],
  [ 'post', '/:tutorId/students/:studentId/newSubmissions/:submissionId/returns', ReturnNewSubmissionController ],
  [ 'post', '/:tutorId/students/:studentId/newSubmissions/:submissionId/closes', CloseNewSubmissionController ],
  [ 'get', '/:tutorId/students/:studentId/newSubmissions/:submissionId/response', DownloadNewSubmissionFeedbackController ],
  [ 'put', '/:tutorId/students/:studentId/newSubmissions/:submissionId/response', UploadNewSubmissionFeedbackController, multer().single('file') ],
  [ 'delete', '/:tutorId/students/:studentId/newSubmissions/:submissionId/response', EraseNewSubmissionFeedbackController ],
  [ 'get', '/:tutorId/students/:studentId/newSubmissions/:submissionId/assignments/:assignmentId', GetNewAssignmentController ],
  [ 'patch', '/:tutorId/newTextBoxes/:textBoxId', SaveNewTextBoxController ],
  [ 'patch', '/:tutorId/newUploadSlots/:uploadSlotId', SaveNewUploadSlotController ],
  [ 'put', '/:tutorId/students/:studentId/note', SaveTutorNoteController ],
  [ 'get', '/:tutorId/newUploadSlots/:uploadSlotId/file', DownloadNewUploadSlotController ],
  [ 'get', '/:tutorId/newAssignmentMedia/:assignmentMediumId/file', DownloadNewAssignmentMediumController ],
  [ 'get', '/:tutorId/newPartMedia/:partMediumId/file', DownloadNewPartMediumController ],
];

applyRoutes(tutorRouter, routes);
