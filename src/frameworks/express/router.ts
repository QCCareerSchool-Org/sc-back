import { Router } from 'express';

import { DownloadCourseHeaderImageController } from '../../controllers/downloadCourseHeaderImageController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const router = Router();

const routes: Route[] = [
  [ 'get', '/courseHeaderImages/:courseId', DownloadCourseHeaderImageController ],
];

applyRoutes(router, routes);
