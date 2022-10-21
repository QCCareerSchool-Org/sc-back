import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { CorsOptions } from 'cors';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { CheckAuthenticationMiddleware } from '../../controllers/authentication/checkAuthenticationMiddleware.js';
import { NotFoundController } from '../../controllers/notFoundController.js';
import { environmentConfigService, winstonLoggerService } from '../../services/index.js';
import { administratorRouter } from './administratorRouter.js';
import { asyncWrapper } from './asyncWrapper.js';
import { authenticationRouter } from './authenticationRouter.js';
import { globalErrorHandler } from './globalErrorHandler.js';
import { multerErrorHandler } from './multerErrorHandler.js';
import { router } from './router.js';
import { studentRouter } from './studentRouter.js';
import { tutorRouter } from './tutorRouter.js';

const { port } = environmentConfigService.config;

const corsOptions: CorsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://studentcenter.qccareerschool.com' : 'http://localhost:3000',
  credentials: true,
  exposedHeaders: [ 'Content-Disposition' ],
};

const app = express();

// app.use(helmet({ frameguard: process.env.NODE_ENV === 'production', crossOriginResourcePolicy: { policy: process.env.NODE_ENV === 'production' ? 'same-origin' : 'same-site' } }));
// app.use(helmet({ crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: process.env.NODE_ENV === 'production' ? 'same-origin' : 'same-site' } }));
app.use(helmet({ crossOriginResourcePolicy: { policy: process.env.NODE_ENV === 'production' ? 'same-origin' : 'same-site' } }));
app.use(compression());
app.use(express.json({ limit: 524_288 })); // 512 KB
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/v1', router);

app.use('/v1/auth', authenticationRouter);

// all routes added after this will require authentication
app.use(asyncWrapper(async (req, res, next) => {
  const middleware = new CheckAuthenticationMiddleware(req, res, next);
  await middleware.execute();
}));

app.use('/v1/administrators', administratorRouter);
app.use('/v1/tutors', tutorRouter);
app.use('/v1/students', studentRouter);

// all other routes return 404
app.use(asyncWrapper(async (req, res) => {
  const controller = new NotFoundController(req, res);
  await controller.execute();
}));

app.use(multerErrorHandler);
app.use(globalErrorHandler);

app.listen(port, () => {
  winstonLoggerService.info(`started on port ${port}`);
});
