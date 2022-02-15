import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';

import { CheckAuthenticationMiddleware } from '../../controllers/authentication/checkAuthenticationMiddleware';
import { NotFoundController } from '../../controllers/notFoundController';
import { environmentConfigService, winstonLoggerService } from '../../services';
import { asyncWrapper } from './asyncWrapper';
import { authenticationRouter } from './authenticationRouter';
import { globalErrorHandler } from './globalErrorHandler';
import { multerErrorHandler } from './multerErrorHandler';
import { studentRouter } from './studentRouter';

const { port } = environmentConfigService.config;

const corsOptions: CorsOptions = {
  origin: [
    'http://localstudentcenter.com:4200',
    'https://sc.qccareerschool.com',
  ],
  credentials: true,
};

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(cookieParser());
app.use(cors(corsOptions));

app.use('/api/auth', authenticationRouter);

// all routes added after this will require authentication
app.use(asyncWrapper(async (req, res, next) => {
  const middleware = new CheckAuthenticationMiddleware(req, res, next);
  await middleware.execute();
}));

app.use('/api/students', studentRouter);

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
