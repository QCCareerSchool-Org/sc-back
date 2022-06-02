import { Router } from 'express';
import multer from 'multer';

import { DownloadNewAssignmentMediumController } from '../../controllers/students/downloadNewAssignmentMediumController';
import { DownloadNewPartMediumController } from '../../controllers/students/downloadNewPartMediumController';
import { DownloadNewUploadSlotController } from '../../controllers/students/downloadNewUploadSlotController';
import { EraseNewUploadSlotController } from '../../controllers/students/eraseNewUploadSlotController';
import { GetEnrollmentController } from '../../controllers/students/getEnrollmentController';
import { GetNewAssignmentController } from '../../controllers/students/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/students/getNewUnitController';
import { GetStudentController } from '../../controllers/students/getStudentController';
import { InitializeNextNewUnitController } from '../../controllers/students/initializeNextNewUnitController';
import { LessonGuardMiddleware } from '../../controllers/students/lessonGuardMiddleware';
import { LessonsStaticFilesMiddleware } from '../../controllers/students/lessonsStaticFilesMiddleware';
import { SaveNewTextBoxTextController } from '../../controllers/students/saveNewTextBoxTextController';
import { SkipNewUnitController } from '../../controllers/students/skipNewUnitController';
import { StudentGuardMiddleware } from '../../controllers/students/studentGuardMiddleware';
import { SubmitNewUnitController } from '../../controllers/students/submitNewUnitController';
import { UploadNewUploadSlotController } from '../../controllers/students/uploadNewUploadSlotController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';

export const studentRouter = Router();

const routes: Route[] = [
  // only the student in question, or any administrator, should be able to access this path
  [ 'use', '/:studentId', StudentGuardMiddleware ],
  // only students enrolled in the course should be able to access this path
  [ 'use', '/:studentId/static/lessons/:courseId', LessonGuardMiddleware ],
  // serve the files directly
  [ 'use', '/:studentId/static/lessons', LessonsStaticFilesMiddleware ],
  // student
  [ 'get', '/:studentId', GetStudentController ],
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
