import { Router } from 'express';
import multer from 'multer';

import { DeleteNewUploadSlotFileController } from '../../controllers/student/deleteNewUploadSlotFileController';
import { DownloadNewUploadSlotFileController } from '../../controllers/student/downloadNewUploadSlotFileController';
import { GetEnrollmentController } from '../../controllers/student/getEnrollmentController';
import { GetNewAssignmentController } from '../../controllers/student/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/student/getNewUnitController';
import { GetStudentController } from '../../controllers/student/getStudentController';
import { InitializeNextNewUnitController } from '../../controllers/student/initializeNextNewUnitController';
import { SaveNewTextBoxTextController } from '../../controllers/student/saveNewTextBoxTextController';
import { SkipNewUnitController } from '../../controllers/student/skipNewUnitController';
import { StudentGuardMiddleware } from '../../controllers/student/studentGuardMiddleware';
import { SubmitNewUnitController } from '../../controllers/student/submitNewUnitController';
import { UploadNewUploadSlotFileController } from '../../controllers/student/uploadNewUploadSlotFileController';
import { asyncWrapper } from './asyncWrapper';

export const studentRouter = Router();

studentRouter.use(
  '/:studentId',
  asyncWrapper(async (req, res, next) => new StudentGuardMiddleware(req, res, next).execute()),
);

studentRouter.get(
  '/:studentId',
  asyncWrapper(async (req, res) => new GetStudentController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId',
  asyncWrapper(async (req, res) => new GetEnrollmentController(req, res).execute()),
);

studentRouter.post(
  '/:studentId/courses/:courseId/newUnits/initializeNext',
  asyncWrapper(async (req, res) => new InitializeNextNewUnitController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId',
  asyncWrapper(async (req, res) => new GetNewUnitController(req, res).execute()),
);

studentRouter.post(
  '/:studentId/courses/:courseId/newUnits/:unitId/submissions',
  asyncWrapper(async (req, res) => new SubmitNewUnitController(req, res).execute()),
);

studentRouter.post(
  '/:studentId/courses/:courseId/newUnits/:unitId/skips',
  asyncWrapper(async (req, res) => new SkipNewUnitController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId',
  asyncWrapper(async (req, res) => new GetNewAssignmentController(req, res).execute()),
);

studentRouter.put(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new SaveNewTextBoxTextController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new DownloadNewUploadSlotFileController(req, res).execute()),
);

studentRouter.put(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  multer().single('file'),
  asyncWrapper(async (req, res) => new UploadNewUploadSlotFileController(req, res).execute()),
);

studentRouter.delete(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new DeleteNewUploadSlotFileController(req, res).execute()),
);
