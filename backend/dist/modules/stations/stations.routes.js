"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stationsRouter = stationsRouter;
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const stations_controller_1 = require("./stations.controller");
const stations_service_1 = require("./stations.service");
function stationsRouter() {
    const router = (0, express_1.Router)();
    const controller = new stations_controller_1.StationsController((0, stations_service_1.buildStationsService)());
    // Public endpoints can be without auth. If you want auth, keep verifyCognitoJwt.
    router.get('/stations', auth_1.verifyCognitoJwt, controller.list);
    router.get('/stations/:stationId', auth_1.verifyCognitoJwt, controller.getById);
    return router;
}
