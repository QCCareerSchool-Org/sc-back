import { Router } from 'express';

import { CreatePasswordResetController } from '../../controllers/authentication/createPasswordResetController';
import { GetPasswordResetController } from '../../controllers/authentication/getPasswordResetController';
import { LoginController } from '../../controllers/authentication/loginController';
import { LogoutController } from '../../controllers/authentication/logoutController';
import { RefreshController } from '../../controllers/authentication/refreshController';
import { UsePasswordResetController } from '../../controllers/authentication/usePasswordResetController';
import type { Route } from './applyRoutes';
import { applyRoutes } from './applyRoutes';
import { browserDetectMiddleware } from './browserDetectMiddleware';
import { locationMiddleware } from './locationMiddleware';

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
