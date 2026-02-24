"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsController = void 0;
const zod_1 = require("zod");
const createSchema = zod_1.z.object({
    stationId: zod_1.z.string().min(1),
    slotFrom: zod_1.z.string().min(1),
    slotTo: zod_1.z.string().min(1)
});
class BookingsController {
    service;
    constructor(service) {
        this.service = service;
    }
    listMyBookings = async (req, res) => {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });
        const data = await this.service.listForUser(userId);
        res.json({ code: 200, data });
    };
    createBooking = async (req, res) => {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });
        const body = createSchema.parse(req.body);
        const data = await this.service.create(userId, body);
        res.status(201).json({ code: 201, data });
    };
    cancelBooking = async (req, res) => {
        const userId = req.user?.sub;
        if (!userId)
            return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });
        const bookingId = zod_1.z.string().min(1).parse(req.params.bookingId);
        const ok = await this.service.cancel(userId, bookingId);
        if (!ok)
            return res.status(404).json({ code: 404, error: { message: 'Booking not found' } });
        res.json({ code: 200, data: { bookingId, status: 'cancelled' } });
    };
}
exports.BookingsController = BookingsController;
