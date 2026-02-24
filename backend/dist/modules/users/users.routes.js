"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usersRouter = usersRouter;
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const users_controller_1 = require("./users.controller");
function usersRouter() {
    const router = (0, express_1.Router)();
    const controller = new users_controller_1.UsersController();
    router.get('/users/me', auth_1.verifyCognitoJwt, controller.getMe);
    return router;
}
