"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
require("express-async-errors");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const errorHandler_1 = require("./middlewares/errorHandler");
const health_routes_1 = require("./modules/health/health.routes");
const stations_routes_1 = require("./modules/stations/stations.routes");
const bookings_routes_1 = require("./modules/bookings/bookings.routes");
const users_routes_1 = require("./modules/users/users.routes");
const auth_routes_1 = require("./modules/auth/auth.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.use((0, morgan_1.default)('dev'));
    app.use((0, cors_1.default)({ origin: env_1.env.corsOrigin === '*' ? true : env_1.env.corsOrigin }));
    app.use(express_1.default.json({ limit: '1mb' }));
    // Health is available without prefix, because current frontend calls /health
    app.use('/', (0, health_routes_1.healthRouter)());
    const api = express_1.default.Router();
    api.use((0, health_routes_1.healthRouter)());
    api.use((0, auth_routes_1.authRouter)());
    api.use((0, users_routes_1.usersRouter)());
    api.use((0, stations_routes_1.stationsRouter)());
    api.use((0, bookings_routes_1.bookingsRouter)());
    // Optional prefix (e.g. /api/v1)
    if (env_1.env.apiPrefix) {
        app.use(env_1.env.apiPrefix, api);
    }
    else {
        app.use('/', api);
    }
    // Not found
    app.use((_req, res) => {
        res.status(404).json({ code: 404, error: { message: 'Not Found' } });
    });
    app.use(errorHandler_1.errorHandler);
    return app;
}
