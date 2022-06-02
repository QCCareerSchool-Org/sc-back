// import * as yup from 'yup';

// import { downloadNewLessonFileInteractor } from '../../interactors/students';
// import type { DownloadNewLessonFileResponseDTO } from '../../interactors/students/downloadNewLessonFileInteractor';
// import { DownloadNewLessonFileFileNotFound, DownloadNewLessonFileFileReadError, DownloadNewLessonFileNotAFile, DownloadNewLessonFileNotEnrolled, DownloadNewLessonFileNotFound } from '../../interactors/students/downloadNewLessonFileInteractor';
// import type { ByteRange } from '../baseController';
// import { BaseController } from '../baseController';

// type Request = {
//   headers: {
//     range?: string;
//   };
//   params: {
//     /** numeric string */
//     studentId: string;
//     /** uuid */
//     lessonId: string;
//     /** numeric string */
//     courseId: string;
//   };
// };

// type Response = DownloadNewLessonFileResponseDTO;

// export class DownloadNewLessonFileController extends BaseController<Request, Response> {

//   protected async validate(): Promise<Request | false> {
//     const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
//       range: yup.string(),
//     });
//     const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
//       studentId: yup.string().matches(/^\d+$/u).defined(),
//       lessonId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
//       courseId: yup.string().matches(/^\d+$/u).defined(),
//     });
//     try {
//       const [ headers, params ] = await Promise.all([
//         headersSchema.validate(this.req.headers),
//         paramsSchema.validate(this.req.params),
//       ]);
//       return { headers, params };
//     } catch (error) {
//       if (error instanceof Error) {
//         this.badRequest(error.message);
//       } else {
//         this.badRequest('invalid request');
//       }
//       return false;
//     }
//   }

//   protected async executeImpl({ headers, params }: Request): Promise<void> {
//     // if (!this.isGetMethod()) {
//     //   return this.methodNotAllowed();
//     // }

//     let byteRange: ByteRange | false | undefined;
//     if (headers.range?.startsWith('bytes=')) {
//       byteRange = this.getByteRange(headers.range);
//     }
//     if (byteRange === false) {
//       return this.rangeNotSatisfiable();
//     }

//     const studentId = parseInt(params.studentId, 10);
//     const courseId = parseInt(params.courseId, 10);
//     const { lessonId } = params;

//     const result = await downloadNewLessonFileInteractor.execute({
//       studentId,
//       lessonId,
//       courseId,
//       remainingFilePath: this.req.params[0],
//       startByte: byteRange?.start,
//       endByte: byteRange?.end,
//     });

//     if (result.success) {
//       this.res.setHeader('Content-Security-Policy', `default-src 'self' data: blob: gap: https://ssl.gstatic.com 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; media-src *`);
//       return this.sendInteractorFileStream(result.value);
//     }

//     switch (result.error.constructor) {
//       case DownloadNewLessonFileNotEnrolled:
//         return this.forbidden('Not enrolled in this course');
//       case DownloadNewLessonFileNotFound:
//         return this.notFound('Lesson not found');
//       case DownloadNewLessonFileFileNotFound:
//         return this.notFound('File not found');
//       case DownloadNewLessonFileNotAFile:
//         return this.forbidden('Access denied');
//       case DownloadNewLessonFileFileReadError:
//         return this.internalServerError('Could not read file');
//       default:
//         return this.internalServerError(result.error.message);
//     }
//   }
// }
