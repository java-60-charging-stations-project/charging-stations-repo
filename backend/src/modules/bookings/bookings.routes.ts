import { Router } from 'express';
import { verifyCognitoJwt } from '../../middlewares/auth';
import { BookingsController } from './bookings.controller';
import { buildBookingsService } from './bookings.service';

export function bookingsRouter(): Router {
  const router = Router();
  const controller = new BookingsController(buildBookingsService());

  router.get('/', verifyCognitoJwt, controller.listMyBookings);
  router.post('/', verifyCognitoJwt, controller.createBooking);
  router.get('/:bookingId', verifyCognitoJwt, controller.getBooking);
  router.delete('/:bookingId', verifyCognitoJwt, controller.cancelBooking);

  return router;
}
