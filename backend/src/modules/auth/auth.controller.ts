import type { Request, Response } from 'express';
import { env } from '../../config/env';

export class AuthController {
  // Gateway does not implement login itself (Cognito does).
  // This endpoint helps frontend discover Cognito configuration.
  getCognitoConfig = async (_req: Request, res: Response) => {
    res.json({
      code: 200,
      data: {
        region: env.cognitoRegion,
        userPoolId: env.cognitoUserPoolId,
        clientId: env.cognitoClientId
      }
    });
  };
}
