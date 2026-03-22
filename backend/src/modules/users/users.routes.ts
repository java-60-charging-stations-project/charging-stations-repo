import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP } from '../../common/authRoles';
import { UsersController } from './users.controller';
import { buildUsersService } from './users.service';

export function usersRouter(): Router {
  const router = Router();
  const controller = new UsersController(buildUsersService());

  // Доступно любому авторизованному пользователю только для своего аккаунта
  router.get('/me', verifyCognitoJwt, controller.getMe);
  router.get('/users/me', verifyCognitoJwt, controller.getMe);
  router.patch('/users/me/profile', verifyCognitoJwt, controller.updateMyProfile);

  // Админские операции над любыми аккаунтами
  router.get(
    '/admin/users',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.listUsers
  );

  router.get(
    '/admin/users/:userId/role',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.getUserRole
  );

  router.get(
    '/admin/users/:userId/details',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.getUserDetails
  );

  router.get(
    '/admin/users/:userId',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.getUserById
  );

  router.patch(
    '/admin/users/:userId/profile',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.updateUserProfileAsAdmin
  );

  router.patch(
    '/admin/users/:userId/role',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.updateUserRole
  );

  router.patch(
    '/admin/users/:userId/enable',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.enableUser
  );

  router.patch(
    '/admin/users/:userId/enable',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.disableUser
  );

  router.delete(
    '/admin/users/:userId',
    verifyCognitoJwt,
    requireGroups([ADMIN_GROUP]),
    controller.deleteUser
  );

  return router;
}
