import type { Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';
import { wrapResponse } from '../../common/wrappers';
import type { UsersService } from './users.service.interface';
import { AdminUserService } from './admin/adminUserServiceInterface';
import { adminChangeUserRoleSchema, adminListUsersSchema } from './admin/schemas';
import { ListUserFilter, ListUserParameters } from './admin/types';

const logger = createLogger('users.controller');

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  address: z.string().min(1).optional()
});

export class UsersController {
  constructor(
    private readonly service: UsersService,
    private readonly adminService: AdminUserService,
  ) {}

  // Admin only Cognito-related operations
  getUserById = async (req: Request, res: Response) => {
    logger.debug("getUserById");
    const { userId } = req.params;
    logger.debug(".getUserById, params: ", { userId });
    const userFull = await this.adminService.getUserById(userId);
    logger.debug(".getUserById, service response: ", userFull);

    res.status(200).json(wrapResponse(userFull));
  };

  listUsers = async (req: Request, res: Response) => {
    logger.debug(".listUsers");
    logger.debug(".listUsers, request query: ", req.query);
    const query = adminListUsersSchema.parse(req.query);
    logger.debug(".listUsers, params: ", query);
    const {limit, paginationToken, filterKey, filterValue} = query;
    const filter: ListUserFilter | undefined = filterKey && filterValue ? { filterKey, filterValue } : undefined;
    const parameters: ListUserParameters = { limit, paginationToken, filter }
    const response = await this.adminService.listUsers(parameters);
    logger.debug(".listUsers, service response: ", response);

    res.status(200).json(wrapResponse(response));
  };

  changeUserRole = async (req: Request, res: Response) => {
    logger.debug(".changeUserRole");
    const { userId } = req.params;
    logger.debug(".changeUserRole, params: ", { userId });

    const { oldRole, newRole } = adminChangeUserRoleSchema.parse(req.body);
    logger.debug(".changeUserRole, params: ", { oldRole, newRole });
    await this.adminService.changeUserRole({ userId, oldRole, newRole });
    logger.debug(".changeUserRole, service call completed");

    res.status(204).send();
  };

  deleteUser = async (req: Request, res: Response) => {
    logger.debug(".deleteUser");
    const { userId } = req.params;
    logger.debug(".deleteUser, params: ", { userId });

    await this.adminService.deleteUser(userId);
    logger.debug(".deleteUser, service call completed");

    res.status(204).send();
  };

  disableUser = async (req: Request, res: Response) => {
    logger.debug(".disableUser");
    const { userId } = req.params;
    logger.debug(".disableUser, params: ", { userId });

    await this.adminService.disableUser(userId);
    logger.debug(".disableUser, service call completed");

    res.status(204).send();
  };

  enableUser = async (req: Request, res: Response) => {
    logger.debug(".enableUser");
    const { userId } = req.params;
    logger.debug(".enableUser, params: ", { userId });

    await this.adminService.enableUser(userId);
    logger.debug(".enableUser, service call completed");

    res.status(204).send();
  };

  // Basic user operations
  getMe = async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    const userInfo = await this.service.getMyInfo(userId);

    res.status(200).json(wrapResponse(userInfo));
  };

  updateMyProfile = async (req: Request, res: Response) => {
    const userId = req.user!.sub;
    
    const payload = updateProfileSchema.parse(req.body);
    await this.service.updateOwnProfile(userId, payload);
    res.json({ code: 200, data: { userId, ...payload } });
  };
}
