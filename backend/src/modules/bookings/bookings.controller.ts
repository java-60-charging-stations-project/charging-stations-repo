import type { Request, Response } from 'express';
import { z } from 'zod';
import type { BookingsService } from './bookings.service';

const createSchema = z.object({
  stationId: z.string().min(1),
  slotFrom: z.string().min(1),
  slotTo: z.string().min(1)
});

export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  listMyBookings = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });

    const data = await this.service.listForUser(userId);
    res.json({ code: 200, data });
  };

  createBooking = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });

    const body = createSchema.parse(req.body);
    const data = await this.service.create(userId, body);
    res.status(201).json({ code: 201, data });
  };

  cancelBooking = async (req: Request, res: Response) => {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ code: 401, error: { message: 'Unauthorized' } });

    const bookingId = z.string().min(1).parse(req.params.bookingId);
    const ok = await this.service.cancel(userId, bookingId);
    if (!ok) return res.status(404).json({ code: 404, error: { message: 'Booking not found' } });

    res.json({ code: 200, data: { bookingId, status: 'cancelled' } });
  };
}
