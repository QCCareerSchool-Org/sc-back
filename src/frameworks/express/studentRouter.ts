import { Router } from 'express';
import multer from 'multer';

import { DownloadNewAssignmentMediumController } from '../../controllers/students/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/students/downloadNewPartMediumController.js';
import { DownloadNewUploadSlotController } from '../../controllers/students/downloadNewUploadSlotController.js';
import { EraseNewUploadSlotController } from '../../controllers/students/eraseNewUploadSlotController.js';
import { GetEnrollmentController } from '../../controllers/students/getEnrollmentController.js';
import { GetNewAssignmentController } from '../../controllers/students/getNewAssignmentController.js';
import { GetNewUnitController } from '../../controllers/students/getNewUnitController.js';
import { GetStudentController } from '../../controllers/students/getStudentController.js';
import { InitializeNextNewUnitController } from '../../controllers/students/initializeNextNewUnitController.js';
import { LessonGuardMiddleware } from '../../controllers/students/lessonGuardMiddleware.js';
import { LessonsStaticFilesMiddleware } from '../../controllers/students/lessonsStaticFilesMiddleware.js';
import { SaveNewTextBoxTextController } from '../../controllers/students/saveNewTextBoxTextController.js';
import { SkipNewUnitController } from '../../controllers/students/skipNewUnitController.js';
import { StudentGuardMiddleware } from '../../controllers/students/studentGuardMiddleware.js';
import { SubmitNewUnitController } from '../../controllers/students/submitNewUnitController.js';
import { UpdateEmailAddressController } from '../../controllers/students/updateEmailAddressController.js';
import { UploadNewUploadSlotController } from '../../controllers/students/uploadNewUploadSlotController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const studentRouter = Router();

const routes: Route[] = [
  // only the student in question, or any administrator, should be able to access this path
  [ 'use', '/:studentId', StudentGuardMiddleware ],
  // only students enrolled in the course should be able to access this path
  [ 'use', '/:studentId/static/lessons/:materialId', LessonGuardMiddleware ],
  // serve the files directly
  [ 'use', '/:studentId/static/lessons', LessonsStaticFilesMiddleware ],
  // student
  [ 'get', '/:studentId', GetStudentController ],
  [ 'put', '/:studentId/emailAddress', UpdateEmailAddressController ],
  // course
  [ 'get', '/:studentId/courses/:courseId', GetEnrollmentController ],
  // units
  [ 'post', '/:studentId/courses/:courseId/newUnits/initializeNext', InitializeNextNewUnitController ],
  [ 'get', '/:studentId/courses/:courseId/newUnits/:unitId', GetNewUnitController ],
  [ 'post', '/:studentId/courses/:courseId/newUnits/:unitId/submissions', SubmitNewUnitController ],
  [ 'post', '/:studentId/courses/:courseId/newUnits/:unitId/skips', SkipNewUnitController ],
  [ 'get', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId', GetNewAssignmentController ],
  [ 'get', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/media/:mediumId/file', DownloadNewAssignmentMediumController ],
  [ 'get', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/media/:mediumId/file', DownloadNewPartMediumController ],
  [ 'put', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', SaveNewTextBoxTextController ],
  [ 'get', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', DownloadNewUploadSlotController ],
  [ 'put', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', UploadNewUploadSlotController, multer().single('file') ],
  [ 'delete', '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', EraseNewUploadSlotController ],
];

applyRoutes(studentRouter, routes);
