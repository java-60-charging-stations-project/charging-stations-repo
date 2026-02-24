import type { BookingDto, CreateBookingRequest } from './bookings.types';

export interface BookingsService {
  listForUser(userId: string): Promise<BookingDto[]>;
  create(userId: string, req: CreateBookingRequest): Promise<BookingDto>;
  cancel(userId: string, bookingId: string): Promise<boolean>;
}

export class MockBookingsService implements BookingsService {
  private bookings: BookingDto[] = [];

  async listForUser(userId: string): Promise<BookingDto[]> {
    return this.bookings.filter((b) => b.userId === userId);
  }

  async create(userId: string, req: CreateBookingRequest): Promise<BookingDto> {
    const booking: BookingDto = {
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

  async cancel(userId: string, bookingId: string): Promise<boolean> {
    const idx = this.bookings.findIndex((b) => b.userId === userId && b.bookingId === bookingId);
    if (idx === -1) return false;
    this.bookings[idx] = { ...this.bookings[idx], status: 'cancelled' };
    return true;
  }
}

export function buildBookingsService(): BookingsService {
  return new MockBookingsService();
}
