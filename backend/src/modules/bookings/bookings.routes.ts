import { Router } from 'express';
import { verifyCognitoJwt } from '../../middlewares/auth';
import { BookingsController } from './bookings.controller';
import { buildBookingsService } from './bookings.service';

export function bookingsRouter(): Router {
  const router = Router();
  const controller = new BookingsController(buildBookingsService());

  router.get('/bookings', verifyCognitoJwt, controller.listMyBookings);
  router.post('/bookings', verifyCognitoJwt, controller.createBooking);
  router.delete('/bookings/:bookingId', verifyCognitoJwt, controller.cancelBooking);

  return router;
}
