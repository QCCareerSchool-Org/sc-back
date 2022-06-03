import { Router } from 'express';

import { CreatePasswordResetController } from '../../controllers/authentication/createPasswordResetController.js';
import { GetPasswordResetController } from '../../controllers/authentication/getPasswordResetController.js';
import { LoginController } from '../../controllers/authentication/loginController.js';
import { LogoutController } from '../../controllers/authentication/logoutController.js';
import { RefreshController } from '../../controllers/authentication/refreshController.js';
import { UsePasswordResetController } from '../../controllers/authentication/usePasswordResetController.js';
import type { Route } from './applyRoutes.js';
import { applyRoutes } from './applyRoutes.js';
import { browserDetectMiddleware } from './browserDetectMiddleware.js';
import { locationMiddleware } from './locationMiddleware.js';

export const authenticationRouter = Router();

const routes: Route[] = [
  // logging in
  [ 'post', '/login', LoginController, locationMiddleware, browserDetectMiddleware ],
  // logging out
  [ 'post', '/logout', LogoutController ],
  // refreshing an authorization token
  [ 'post', '/refresh', RefreshController ],
  // requesting a password reset
  [ 'post', '/password-resets', CreatePasswordResetController ],
  // verifying a password reset
  [ 'get', '/password-resets/:id', GetPasswordResetController ],
  // supplying a new password via a password reset
  [ 'post', '/password-resets/:id', UsePasswordResetController ],
];

applyRoutes(authenticationRouter, routes);
