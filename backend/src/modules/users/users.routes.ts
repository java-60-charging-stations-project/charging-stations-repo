import { Router } from 'express';
import { verifyCognitoJwt, requireGroups } from '../../middlewares/auth';
import { ADMIN_GROUP } from '../../common/authRoles';
import { UsersController } from './users.controller';
import { buildAdminService, buildUsersService } from './users.service';
import { requireUserId } from '../../middlewares/requireParam';
import { modifySelfControl } from '../../middlewares/adminControl';

export function usersRouter(): Router {
  const router = Router();

  const controller = new UsersController(buildUsersService(), buildAdminService());

  router.use(verifyCognitoJwt);

  // Any authorized user operations
  router.get('/me', controller.getMe);
  router.get('/users/me', controller.getMe);
  router.patch('/users/me/profile', controller.updateMyProfile);

  // Admin only operations
  router.use("/admin", requireGroups([ADMIN_GROUP]));
  router.use("/admin/users/:userId", requireUserId);

  router.get('/admin/users', controller.listUsers);
  router.get('/admin/users/:userId', controller.getUserById);
  router.patch('/admin/users/:userId/role', modifySelfControl, controller.changeUserRole);
  router.patch('/admin/users/:userId/enable', modifySelfControl, controller.enableUser);
  router.patch('/admin/users/:userId/disable', modifySelfControl, controller.disableUser);
  router.delete('/admin/users/:userId', modifySelfControl, controller.deleteUser);

  return router;
}
