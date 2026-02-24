import type { Request, Response } from 'express';

export class UsersController {
  getMe = async (req: Request, res: Response) => {
    if (!req.user?.sub) {
      return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });
    }

    res.json({
      code: 200,
      data: {
        userId: req.user.sub,
        email: req.user.email,
        username: req.user.username,
        groups: req.user.groups ?? []
      }
    });
  };
}
