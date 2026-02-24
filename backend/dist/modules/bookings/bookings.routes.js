"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookingsRouter = bookingsRouter;
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth");
const bookings_controller_1 = require("./bookings.controller");
const bookings_service_1 = require("./bookings.service");
function bookingsRouter() {
    const router = (0, express_1.Router)();
    const controller = new bookings_controller_1.BookingsController((0, bookings_service_1.buildBookingsService)());
    router.get('/bookings', auth_1.verifyCognitoJwt, controller.listMyBookings);
    router.post('/bookings', auth_1.verifyCognitoJwt, controller.createBooking);
    router.delete('/bookings/:bookingId', auth_1.verifyCognitoJwt, controller.cancelBooking);
    return router;
}
