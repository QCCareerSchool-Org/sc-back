import { Router } from 'express';
import multer from 'multer';

import { DeleteMaterialCompletionController } from '../../controllers/students/deleteMaterialCompletionController.js';
import { DownloadMaterialImageController } from '../../controllers/students/downloadMaterialImageController.js';
import { DownloadNewAssignmentMediumController } from '../../controllers/students/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/students/downloadNewPartMediumController.js';
import { DownloadNewSubmissionFeedbackController } from '../../controllers/students/downloadNewSubmissionFeedbackController.js';
import { DownloadNewUploadSlotController } from '../../controllers/students/downloadNewUploadSlotController.js';
import { DownloadTutorIntroController } from '../../controllers/students/downloadTutorIntroController.js';
import { EraseNewUploadSlotController } from '../../controllers/students/eraseNewUploadSlotController.js';
import { GetEnrollmentController } from '../../controllers/students/getEnrollmentController.js';
import { GetMaterialController } from '../../controllers/students/getMaterialController.js';
import { GetNewAssignmentController } from '../../controllers/students/getNewAssignmentController.js';
import { GetNewSubmissionController } from '../../controllers/students/getNewSubmissionController.js';
import { GetStudentController } from '../../controllers/students/getStudentController.js';
import { GetT2202ReceiptsController } from '../../controllers/students/getT2202ReceiptsController.js';
import { GetVideoController } from '../../controllers/students/getVideoController.js';
import { InitializeNextNewSubmissionController } from '../../controllers/students/initializeNextNewUnitController.js';
import { InsertMaterialCompletionController } from '../../controllers/students/insertMaterialCompletionController.js';
import { InsertOrUpdateMetadataController } from '../../controllers/students/insertOrUpdateMetadataController.js';
import { LessonGuardMiddleware } from '../../controllers/students/lessonGuardMiddleware.js';
import { LessonsStaticFilesMiddleware } from '../../controllers/students/lessonsStaticFilesMiddleware.js';
import { SaveMaterialDataController } from '../../controllers/students/saveMaterialDataController.js';
import { SaveNewTextBoxTextController } from '../../controllers/students/saveNewTextBoxTextController.js';
import { SkipNewSubmissionController } from '../../controllers/students/skipNewSubmissionController.js';
import { StudentGuardMiddleware } from '../../controllers/students/studentGuardMiddleware.js';
import { SubmitNewSubmissionController } from '../../controllers/students/submitNewSubmissionController.js';
import { UpdateEmailAddressController } from '../../controllers/students/updateEmailAddressController.js';
import { UpdateNewSubmissionResponseProgressController } from '../../controllers/students/updateNewSubmissionResponseProgressController.js';
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
  // tax receipts
  [ 'get', '/:studentId/t2202Receipts', GetT2202ReceiptsController ],
  // course
  [ 'get', '/:studentId/courses/:courseId', GetEnrollmentController ],
  [ 'get', '/:studentId/courses/:courseId/tutorIntro', DownloadTutorIntroController ],
  // submissions
  [ 'post', '/:studentId/courses/:courseId/newSubmissions/initializeNext', InitializeNextNewSubmissionController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId', GetNewSubmissionController ],
  [ 'post', '/:studentId/courses/:courseId/newSubmissions/:submissionId/submissions', SubmitNewSubmissionController ],
  [ 'post', '/:studentId/courses/:courseId/newSubmissions/:submissionId/skips', SkipNewSubmissionController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId/response', DownloadNewSubmissionFeedbackController ],
  [ 'put', '/:studentId/courses/:courseId/newSubmissions/:submissionId/responseProgress', UpdateNewSubmissionResponseProgressController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId', GetNewAssignmentController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/media/:mediumId/file', DownloadNewAssignmentMediumController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/parts/:partId/media/:mediumId/file', DownloadNewPartMediumController ],
  [ 'put', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', SaveNewTextBoxTextController ],
  [ 'get', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', DownloadNewUploadSlotController ],
  [ 'put', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', UploadNewUploadSlotController, multer().single('file') ],
  [ 'delete', '/:studentId/courses/:courseId/newSubmissions/:submissionId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file', EraseNewUploadSlotController ],
  // metadata
  [ 'post', '/:studentId/courses/:courseId/metadata', InsertOrUpdateMetadataController ],
  // materials
  [ 'get', '/:studentId/materials/:materialId', GetMaterialController ],
  [ 'post', '/:studentId/materials/:materialId/data', SaveMaterialDataController ],
  [ 'get', '/:studentId/materials/:materialId/image', DownloadMaterialImageController ],
  [ 'post', '/:studentId/enrollments/:enrollmentId/materials/:materialId/materialCompletions', InsertMaterialCompletionController ],
  [ 'delete', '/:studentId/enrollments/:enrollmentId/materials/:materialId/materialCompletions', DeleteMaterialCompletionController ],
  // videos
  [ 'get', '/:studentId/videos/:videoId', GetVideoController ],
];

applyRoutes(studentRouter, routes);
