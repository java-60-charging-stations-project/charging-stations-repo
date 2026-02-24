"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
class UsersController {
    getMe = async (req, res) => {
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
exports.UsersController = UsersController;
