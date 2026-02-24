"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockBookingsService = void 0;
exports.buildBookingsService = buildBookingsService;
class MockBookingsService {
    bookings = [];
    async listForUser(userId) {
        return this.bookings.filter((b) => b.userId === userId);
    }
    async create(userId, req) {
        const booking = {
            bookingId: `bk-${Date.now()}`,
            userId,
            stationId: req.stationId,
            slotFrom: req.slotFrom,
            slotTo: req.slotTo,
            status: 'created'
        };
        this.bookings = [booking, ...this.bookings];
        return booking;
    }
    async cancel(userId, bookingId) {
        const idx = this.bookings.findIndex((b) => b.userId === userId && b.bookingId === bookingId);
        if (idx === -1)
            return false;
        this.bookings[idx] = { ...this.bookings[idx], status: 'cancelled' };
        return true;
    }
}
exports.MockBookingsService = MockBookingsService;
function buildBookingsService() {
    return new MockBookingsService();
}
