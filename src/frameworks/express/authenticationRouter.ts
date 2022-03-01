import { Router } from 'express';

import { CreatePasswordResetController } from '../../controllers/authentication/createPasswordResetController';
import { GetPasswordResetController } from '../../controllers/authentication/getPasswordResetController';
import { LoginController } from '../../controllers/authentication/loginController';
import { LogoutController } from '../../controllers/authentication/logoutController';
import { RefreshController } from '../../controllers/authentication/refreshController';
import { UsePasswordResetController } from '../../controllers/authentication/usePasswordResetController';
import { asyncWrapper } from './asyncWrapper';
import { browserDetectMiddleware } from './browserDetectMiddleware';
import { locationMiddleware } from './locationMiddleware';

export const authenticationRouter = Router();

// logging in
authenticationRouter.post('/login', [ locationMiddleware, browserDetectMiddleware ], asyncWrapper(async (req, res) => {
  const controller = new LoginController(req, res);
  await controller.execute();
}));

// logging out
authenticationRouter.post('/logout', asyncWrapper(async (req, res) => {
  const controller = new LogoutController(req, res);
  await controller.execute();
}));

// refreshing an authorization token
authenticationRouter.post('/refresh', asyncWrapper(async (req, res) => {
  const controller = new RefreshController(req, res);
  await controller.execute();
}));

// requesting a password reset
authenticationRouter.post('/password-resets', asyncWrapper(async (req, res) => {
  const controller = new CreatePasswordResetController(req, res);
  await controller.execute();
}));

// verifying a password reset
authenticationRouter.get('/password-resets/:id', asyncWrapper(async (req, res) => {
  const controller = new GetPasswordResetController(req, res);
  await controller.execute();
}));

// supplying a new password via a password reset
authenticationRouter.post('/password-resets/:id', asyncWrapper(async (req, res) => {
  const controller = new UsePasswordResetController(req, res);
  await controller.execute();
}));
