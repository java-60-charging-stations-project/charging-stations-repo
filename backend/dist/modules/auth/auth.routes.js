"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = authRouter;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
function authRouter() {
    const router = (0, express_1.Router)();
    const controller = new auth_controller_1.AuthController();
    router.get('/auth/config', controller.getCognitoConfig);
    return router;
}
