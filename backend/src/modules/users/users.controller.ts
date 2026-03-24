import type { Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';
import { wrapResponse } from '../../common/wrappers';
import type { UsersService } from './users.service.interface';
import { AdminUserService } from './admin/adminUserServiceInterface';
import { adminChangeUserRoleSchema, adminListUsersSchema } from './admin/schemas';

const logger = createLogger('users.controller');

const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  address: z.string().min(1).optional()
});

const updateRoleSchema = z.object({
  email: z.string(),
  oldRole: z.string().min(1),
  newRole: z.string().min(1),
  updatedAt: z.string(),
});

const enableUserSchema = z.object({
  email: z.string(),
  updatedAt: z.string(),
});

const listUsersQuerySchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(200)
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
    const query = adminListUsersSchema.parse(req.query);
    logger.debug(".listUsers, params: ", query);
    const result = await this.adminService.listUsers(query);
    logger.debug(".listUsers, service response: ", result);

    res.status(200).json(wrapResponse(result));
  };

  changeUserRole = async (req: Request, res: Response) => {
    logger.debug(".changeUserRole");
    const { userId } = req.params;
    logger.debug(".changeUserRole, params: ", { userId });

    const { oldRole, newRole } = adminChangeUserRoleSchema.parse(req.body);
    logger.debug(".changeUserRole, params: ", { oldRole, newRole });
    await this.adminService.changeUserRole({ userId, oldRole, newRole });
    logger.debug(".changeUserRole, service call completed");

    res.status(204);
  };

  deleteUser = async (req: Request, res: Response) => {
    logger.debug(".deleteUser");
    const { userId } = req.params;
    logger.debug(".deleteUser, params: ", { userId });

    await this.adminService.deleteUser(userId);
    logger.debug(".deleteUser, service call completed");

    res.status(204);
  };

  disableUser = async (req: Request, res: Response) => {
    logger.debug(".disableUser");
    const { userId } = req.params;
    logger.debug(".disableUser, params: ", { userId });

    await this.adminService.disableUser(userId);
    logger.debug(".disableUser, service call completed");

    res.status(204);
  };

  enableUser = async (req: Request, res: Response) => {
    logger.debug(".disableUser");
    const { userId } = req.params;
    logger.debug(".enableUser, params: ", { userId });

    await this.adminService.enableUser(userId);
    logger.debug(".enableUser, service call completed");

    res.status(204);
  };

  // Basic user operations
  getMe = async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      return res
        .status(401)
        .json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } });
    }

    const userId = req.user.sub;
    const userInfo = await this.service.getMyInfo(userId);

    res.status(200).json(wrapResponse(userInfo));
  };

  updateMyProfile = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) {
      return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });
    }

    const payload = updateProfileSchema.parse(req.body);
    await this.service.updateOwnProfile(userId, payload);
    res.json({ code: 200, data: { userId, ...payload } });
  };
}
