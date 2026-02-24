"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthRouter = healthRouter;
const express_1 = require("express");
const health_controller_1 = require("./health.controller");
const health_service_1 = require("./health.service");
function healthRouter() {
    const router = (0, express_1.Router)();
    const controller = new health_controller_1.HealthController((0, health_service_1.buildHealthService)());
    router.get('/health', controller.getHealth);
    return router;
}
