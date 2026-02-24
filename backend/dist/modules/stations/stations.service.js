"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockStationsService = void 0;
exports.buildStationsService = buildStationsService;
// Placeholder business-logic implementation.
// In production this should call Python Lambdas which read from DynamoDB.
class MockStationsService {
    stations = [
        { stationId: 'st-001', name: 'Demo Station 1', status: 'available' },
        { stationId: 'st-002', name: 'Demo Station 2', status: 'busy' }
    ];
    async list() {
        return this.stations;
    }
    async getById(stationId) {
        return this.stations.find((s) => s.stationId === stationId) ?? null;
    }
}
exports.MockStationsService = MockStationsService;
function buildStationsService() {
    return new MockStationsService();
}
