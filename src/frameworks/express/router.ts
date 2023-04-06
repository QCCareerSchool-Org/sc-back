import { Router } from 'express';

import { DownloadNewAssignmentMediumController } from '../../controllers/administrators/downloadNewAssignmentMediumController.js';
import { DownloadNewPartMediumController } from '../../controllers/administrators/downloadNewPartMediumController.js';
import { DownloadCourseHeaderImageController } from '../../controllers/downloadCourseHeaderImageController.js';
import { downloadCourseIconImageController } from '../../controllers/downloadCourseIconImageController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const router = Router();

const routes: Route[] = [
  [ 'get', '/courseHeaderImages/:courseId', DownloadCourseHeaderImageController ],
  [ 'get', '/courseIconImages/:courseId', downloadCourseIconImageController ],

  [ 'get', '/:administratorId/newAssignmentMedia/:mediumId/file', DownloadNewAssignmentMediumController ],
  [ 'get', '/:administratorId/newPartMedia/:mediumId/file', DownloadNewPartMediumController ],
];

applyRoutes(router, routes);
