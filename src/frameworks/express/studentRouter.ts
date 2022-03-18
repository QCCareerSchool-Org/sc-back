import { Router } from 'express';
import multer from 'multer';

import { DeleteNewUploadSlotFileController } from '../../controllers/students/deleteNewUploadSlotFileController';
import { DownloadNewAssignmentMediumController } from '../../controllers/students/downloadNewAssignmentMediumController';
import { DownloadNewPartMediumController } from '../../controllers/students/downloadNewPartMediumController';
import { DownloadNewUploadSlotController } from '../../controllers/students/downloadNewUploadSlotController';
import { GetEnrollmentController } from '../../controllers/students/getEnrollmentController';
import { GetNewAssignmentController } from '../../controllers/students/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/students/getNewUnitController';
import { GetStudentController } from '../../controllers/students/getStudentController';
import { InitializeNextNewUnitController } from '../../controllers/students/initializeNextNewUnitController';
import { SaveNewTextBoxTextController } from '../../controllers/students/saveNewTextBoxTextController';
import { SkipNewUnitController } from '../../controllers/students/skipNewUnitController';
import { StudentGuardMiddleware } from '../../controllers/students/studentGuardMiddleware';
import { SubmitNewUnitController } from '../../controllers/students/submitNewUnitController';
import { UploadNewUploadSlotController } from '../../controllers/students/uploadNewUploadSlotController';
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

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/media/:mediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewAssignmentMediumController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/media/:mediumId/file',
  asyncWrapper(async (req, res) => new DownloadNewPartMediumController(req, res).execute()),
);

studentRouter.put(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId',
  asyncWrapper(async (req, res) => new SaveNewTextBoxTextController(req, res).execute()),
);

studentRouter.get(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file',
  asyncWrapper(async (req, res) => new DownloadNewUploadSlotController(req, res).execute()),
);

studentRouter.put(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId/file',
  multer().single('file'),
  asyncWrapper(async (req, res) => new UploadNewUploadSlotController(req, res).execute()),
);

studentRouter.delete(
  '/:studentId/courses/:courseId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId',
  asyncWrapper(async (req, res) => new DeleteNewUploadSlotFileController(req, res).execute()),
);
