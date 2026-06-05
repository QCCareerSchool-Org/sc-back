import { Router } from 'express';

import { DownloadCourseHeaderImageController } from '../../controllers/downloadCourseHeaderImageController.js';
import { DownloadCourseIconImageController } from '../../controllers/downloadCourseIconImageController.js';
import { GetAwardController } from '../../controllers/getAwardController.js';
import { GetCertificateController } from '../../controllers/getCertificateController.js';
import { GetCertificateControllerPublic } from '../../controllers/getCertificateControllerPublic.js';
import { GetOldAwardController } from '../../controllers/getOldAwardController.js';
import { GetVideoController } from '../../controllers/getVideoController.js';
import { InsertSurveyCompletionController } from '../../controllers/insertSurveyCompletionController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';

export const router = Router();

const routes: Route[] = [
  [ 'get', '/courseHeaderImages/:courseId', DownloadCourseHeaderImageController ],
  [ 'get', '/courseIconImages/:courseId', DownloadCourseIconImageController ],
  [ 'get', '/videos/:videoId', GetVideoController ],
  [ 'post', '/surveys/:surveyId/completions', InsertSurveyCompletionController ],
  [ 'get', '/awards/:submissionId', GetAwardController ],
  [ 'get', '/oldAwards/:submissionId', GetOldAwardController ],
  [ 'get', '/certificates/:studentId/courses/:courseId', GetCertificateController ],
  [ 'get', '/certificates/:signature', GetCertificateControllerPublic ],
];

applyRoutes(router, routes);
