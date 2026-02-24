"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StationsController = void 0;
const zod_1 = require("zod");
const idSchema = zod_1.z.string().min(1);
class StationsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list = async (_req, res) => {
        const data = await this.service.list();
        res.json({ code: 200, data });
    };
    getById = async (req, res) => {
        const stationId = idSchema.parse(req.params.stationId);
        const data = await this.service.getById(stationId);
        if (!data) {
            return res.status(404).json({ code: 404, error: { message: 'Station not found' } });
        }
        res.json({ code: 200, data });
    };
}
exports.StationsController = StationsController;
