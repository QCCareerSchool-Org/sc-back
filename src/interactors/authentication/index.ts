import { prisma } from '../../frameworks/prisma/index.js';
import { dateService, environmentConfigService, ipaddrJSIPAddressService, jwtService, nodeCryptoService, nodeFileService, nodeMailerEmailService, passwordService, studentService, telephoneNumberService, uuidService, winstonLoggerService } from '../../services/index.js';
import { CheckAuthenticationInteractor } from './checkAuthenticationInteractor.js';
import { CreatePasswordResetInteractor } from './createPasswordResetInteractor.js';
import { GetPasswordResetInteractor } from './getPasswordResetInteractor.js';
import { LoginInteractor } from './loginInteractor.js';
import { LogoutInteractor } from './logoutInteractor.js';
import { RefreshInteractor } from './refreshInteractor.js';
import { UsePasswordResetInteractor } from './usePasswordResetInteractor.js';

// use-case interactor singletons
export const checkAuthenticationInteractor = new CheckAuthenticationInteractor(jwtService, winstonLoggerService);
export const loginInteractor = new LoginInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, uuidService, ipaddrJSIPAddressService, studentService, winstonLoggerService);
export const logoutInteractor = new LogoutInteractor(prisma, winstonLoggerService);
export const refreshInteractor = new RefreshInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, winstonLoggerService);
export const createPasswordResetInteractor = new CreatePasswordResetInteractor(prisma, telephoneNumberService, nodeMailerEmailService, nodeFileService, nodeCryptoService, dateService, environmentConfigService, studentService, winstonLoggerService);
export const getPasswordResetInteractor = new GetPasswordResetInteractor(prisma, winstonLoggerService);
export const usePasswordResetInteractor = new UsePasswordResetInteractor(prisma, nodeCryptoService, dateService, passwordService, environmentConfigService, winstonLoggerService);
