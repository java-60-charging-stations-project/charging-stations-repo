"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
class HealthController {
    service;
    constructor(service) {
        this.service = service;
    }
    getHealth = async (_req, res) => {
        const result = await this.service.check();
        res.status(result.code).json(result);
    };
}
exports.HealthController = HealthController;
