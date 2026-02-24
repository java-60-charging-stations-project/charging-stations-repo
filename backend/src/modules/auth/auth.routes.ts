import { Router } from 'express';
import { AuthController } from './auth.controller';

export function authRouter(): Router {
  const router = Router();
  const controller = new AuthController();

  router.get('/auth/config', controller.getCognitoConfig);
  return router;
}
