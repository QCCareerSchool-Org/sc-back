import { prisma } from '../../frameworks/prisma';
import { dateService, environmentConfigService, ipaddrJSIPAddressService, jwtService, nodeCryptoService, nodeFileService, nodeMailerEmailService, passwordService, studentService, telephoneNumberService, winstonLoggerService } from '../../services';
import { CheckAuthenticationInteractor } from './checkAuthenticationInteractor';
import { CreatePasswordResetInteractor } from './createPasswordResetInteractor';
import { GetPasswordResetInteractor } from './getPasswordResetInteractor';
import { LoginInteractor } from './loginInteractor';
import { LogoutInteractor } from './logoutInteractor';
import { RefreshInteractor } from './refreshInteractor';
import { UsePasswordResetInteractor } from './usePasswordResetInteractor';

// use-case interactor singletons
export const checkAuthenticationInteractor = new CheckAuthenticationInteractor(jwtService, winstonLoggerService);
export const loginInteractor = new LoginInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, ipaddrJSIPAddressService, studentService, winstonLoggerService);
export const logoutInteractor = new LogoutInteractor(prisma, winstonLoggerService);
export const refreshInteractor = new RefreshInteractor(prisma, environmentConfigService, dateService, jwtService, nodeCryptoService, winstonLoggerService);
export const createPasswordResetInteractor = new CreatePasswordResetInteractor(prisma, telephoneNumberService, nodeMailerEmailService, nodeFileService, nodeCryptoService, dateService, studentService, winstonLoggerService);
export const getPasswordResetInteractor = new GetPasswordResetInteractor(prisma, winstonLoggerService);
export const usePasswordResetInteractor = new UsePasswordResetInteractor(prisma, nodeCryptoService, dateService, passwordService, winstonLoggerService);
