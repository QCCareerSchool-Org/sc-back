import { Router } from 'express';

import { AuditorGuardMiddleware } from '../../controllers/auditors/auditorGuardMiddleware.js';
import { GetStudentController } from '../../controllers/auditors/getStudentController.js';
import { GetStudentsController } from '../../controllers/auditors/getStudentsController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const auditorRouter = Router();

const routes: Route[] = [
  // only the auditor in question, or any administrator, should be able to access this path
  [ 'use', '/:auditorId', AuditorGuardMiddleware ],
  [ 'get', '/:auditorId/students', GetStudentsController ],
  [ 'get', '/:auditorId/students/:studentId', GetStudentController ],
];

applyRoutes(auditorRouter, routes);
