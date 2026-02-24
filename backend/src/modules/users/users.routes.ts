import { Router } from 'express';
import { verifyCognitoJwt } from '../../middlewares/auth';
import { UsersController } from './users.controller';

export function usersRouter(): Router {
  const router = Router();
  const controller = new UsersController();

  router.get('/users/me', verifyCognitoJwt, controller.getMe);

  return router;
}
