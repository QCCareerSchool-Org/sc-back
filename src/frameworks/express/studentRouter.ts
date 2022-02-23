import { Router } from 'express';
import multer from 'multer';
import { DeleteNewUploadSlotFileController } from '../../controllers/student/deleteNewUploadSlotFileController';
import { DownloadNewUploadSlotFileController } from '../../controllers/student/downloadNewUploadSlotFileController';

import { GetEnrollmentController } from '../../controllers/student/getEnrollmentController';
import { GetNewAssignmentController } from '../../controllers/student/getNewAssignmentController';
import { GetNewUnitController } from '../../controllers/student/getNewUnitController';
import { GetStudentController } from '../../controllers/student/getStudentController';
import { SaveNewTextBoxTextController } from '../../controllers/student/saveNewTextBoxTextController';
import { StudentGuardMiddleware } from '../../controllers/student/studentGuardMiddleware';
import { UploadNewUploadSlotFileController } from '../../controllers/student/uploadNewUploadSlotFileController';

import { asyncWrapper } from './asyncWrapper';

export const studentRouter = Router();

studentRouter.use('/:studentId', asyncWrapper(async (req, res, next) => {
  const middleware = new StudentGuardMiddleware(req, res, next);
  await middleware.execute();
}));

studentRouter.get('/:studentId', asyncWrapper(async (req, res) => {
  const middleware = new GetStudentController(req, res);
  await middleware.execute();
}));

studentRouter.get('/:studentId/enrollments', asyncWrapper(async (req, res) => {
  const controller = new GetEnrollmentController(req, res);
  await controller.execute();
}));

studentRouter.get('/:studentId/newUnits/:unitId', asyncWrapper(async (req, res) => {
  const controller = new GetNewUnitController(req, res);
  await controller.execute();
}));

studentRouter.get('/:studentId/newUnits/:unitId/assignments/:assignmentId', asyncWrapper(async (req, res) => {
  const controller = new GetNewAssignmentController(req, res);
  await controller.execute();
}));

studentRouter.put('/:studentId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/textBoxes/:textBoxId', asyncWrapper(async (req, res) => {
  const controller = new SaveNewTextBoxTextController(req, res);
  await controller.execute();
}));

studentRouter.get('/:studentId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', asyncWrapper(async (req, res) => {
  const controller = new DownloadNewUploadSlotFileController(req, res);
  await controller.execute();
}));

studentRouter.put('/:studentId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', multer().single('file'), asyncWrapper(async (req, res) => {
  const controller = new UploadNewUploadSlotFileController(req, res);
  await controller.execute();
}));

studentRouter.delete('/:studentId/newUnits/:unitId/assignments/:assignmentId/parts/:partId/uploadSlots/:uploadSlotId', asyncWrapper(async (req, res) => {
  const controller = new DeleteNewUploadSlotFileController(req, res);
  await controller.execute();
}));
