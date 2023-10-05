import * as yup from 'yup';

import { insertSurveyCompletionInteractor, validateHMACInteractor } from '../interactors/index.js';
import type { InsertSurveyCompletionResponseDTO } from '../interactors/insertSurveyCompletionInteractor.js';
import { InsertSurveyCompletionStudentNotFound, InsertSurveyCompletionSurveyNotFound } from '../interactors/insertSurveyCompletionInteractor.js';
import { ValidateHMACFailed } from '../interactors/validateHMACInteractor.js';
import { BaseController } from './baseController.js';

// type Answer = {
//   type: 'choice' | string;
//   choice?: {
//     id: string;
//     label: string;
//     /** UUID */
//     ref: string;
//   };
//   field: {
//     id: string;
//     type: 'multiple_choice' | string;
//     /** UUID */
//     ref: string;
//   };
// };

// type Ending = {
//   id: string;
//   /** UUID */
//   ref: string;
//   title: string;
//   type: 'url_redirect' | string;
//   properties: {
//     redirect_url?: string;
//   };
// };

// type Choice = {
//   id: string;
//   /** UUID */
//   ref: string;
//   label: string;
// };

// type Field = {
//   id: string;
//   /** UUID */
//   ref: string;
//   type: 'multiple_choice';
//   title: string;
//   properties: object;
//   allow_other_choice: boolean;
//   choices: Choice[];
// };

// type Definition = {
//   id: string;
//   title: string;
//   fields: Field[];
//   endings: Ending[];
// };

type Request = {
  headers: {
    'typeform-signature': string;
  };
  params: {
    /** uuid */
    surveyId: string;
  };
  body: {
    event_id: string;
    event_type: 'form_response' | string;
    form_response: {
      form_id: string;
      token: string;
      landed_at: Date;
      submitted_at: Date;
      hidden: {
        student_id: string;
      };
      // definition: Definition;
      // answers: Answer[];
      // ending: {
      //   id: string;
      //   /** UUID */
      //   ref: string;
      // };
    };
  };
};

type Response = InsertSurveyCompletionResponseDTO;

export class InsertSurveyCompletionController extends BaseController<Request, Response> {

  protected async validate(): Promise<Request | false> {
    const headersSchema: yup.SchemaOf<Request['headers']> = yup.object({
      'typeform-signature': yup.string().matches(/^sha256=/u).defined(),
    });
    const paramsSchema: yup.SchemaOf<Request['params']> = yup.object({
      surveyId: yup.string().matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu).defined(),
    });
    const bodySchema: yup.SchemaOf<Request['body']> = yup.object({
      event_id: yup.string().defined(), // eslint-disable-line camelcase
      event_type: yup.string().defined(), // eslint-disable-line camelcase
      form_response: yup.object({ // eslint-disable-line camelcase
        form_id: yup.string().defined(), // eslint-disable-line camelcase
        token: yup.string().defined(),
        landed_at: yup.date().defined(), // eslint-disable-line camelcase
        submitted_at: yup.date().defined(), // eslint-disable-line camelcase
        hidden: yup.object({
          student_id: yup.string().matches(/\d+/u).defined(), // eslint-disable-line camelcase
        }),
      }).defined(),
    });
    try {
      const [ headers, params, body ] = await Promise.all([
        headersSchema.validate(this.req.headers),
        paramsSchema.validate(this.req.params),
        bodySchema.validate(this.req.body),
      ]);
      return { headers, params, body };
    } catch (error) {
      if (error instanceof Error) {
        this.badRequest(error.message);
      } else {
        this.badRequest('invalid request');
      }
      return false;
    }
  }

  protected async executeImpl({ headers, params, body }: Request): Promise<void> {
    if (!this.isPostMethod()) {
      return this.methodNotAllowed();
    }

    if (typeof this.req.rawBody === 'undefined') {
      return this.internalServerError('Raw body not found');
    }

    const hmac = headers['typeform-signature'].substring(7);

    const validateResult = await validateHMACInteractor.execute({ data: this.req.rawBody, hmac });
    if (!validateResult.success) {
      switch (validateResult.error.constructor) {
        case ValidateHMACFailed:
          return this.badRequest('Signature doesn\'t match');
        default:
          return this.internalServerError(validateResult.error.message);
      }
    }

    const studentId = parseInt(body.form_response.hidden.student_id, 10);

    const result = await insertSurveyCompletionInteractor.execute({ surveyId: params.surveyId, studentId });

    if (result.success) {
      return this.ok(result.value);
    }

    switch (result.error.constructor) {
      case InsertSurveyCompletionSurveyNotFound:
        return this.notFound('Survey not found');
      case InsertSurveyCompletionStudentNotFound:
        return this.notFound('Student not found');
      default:
        return this.internalServerError(result.error.message);
    }
  }
}
