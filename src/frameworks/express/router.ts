import { Router } from 'express';

import { DownloadCourseHeaderImageController } from '../../controllers/downloadCourseHeaderImageController.js';
import { downloadCourseIconImageController } from '../../controllers/downloadCourseIconImageController.js';
import { GetVideoController } from '../../controllers/getVideoController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const router = Router();

const routes: Route[] = [
  [ 'get', '/courseHeaderImages/:courseId', DownloadCourseHeaderImageController ],
  [ 'get', '/courseIconImages/:courseId', downloadCourseIconImageController ],
  [ 'get', '/videos/:videoId', GetVideoController ],
];

applyRoutes(router, routes);
