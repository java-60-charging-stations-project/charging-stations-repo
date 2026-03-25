import type { BookingDto, CreateBookingRequest } from './bookings.types';
import { updateStationStateLocal, findStationById } from '../stations/local/stations.service.local';

export interface BookingsService {
  listForUser(userId: string): Promise<BookingDto[]>;
  create(userId: string, req: CreateBookingRequest): Promise<BookingDto>;
  cancel(userId: string, bookingId: string): Promise<boolean>;
  processExpiredBookings(): Promise<void>;
  /** Booking with status `created` whose slot contains `at` (half-open [slotFrom, slotTo)). */
  getActiveBookingForUserStation(
    userId: string,
    stationId: string,
    at: Date
  ): Promise<BookingDto | null>;
  /** After a charging session successfully starts, mark the booking as paid/consumed. */
  markPaid(userId: string, bookingId: string): Promise<void>;
}

export class MockBookingsService implements BookingsService {
  private bookings: BookingDto[] = [];

  constructor() {
    setInterval(() => {
      this.processExpiredBookings().catch((err) => {
        console.error('[MockBookingsService] failed processing expired bookings', err);
      });
    }, 60 * 1000);
  }

  async listForUser(userId: string): Promise<BookingDto[]> {
    await this.processExpiredBookings();
    return this.bookings.filter((b) => b.userId === userId);
  }

  async create(userId: string, req: CreateBookingRequest): Promise<BookingDto> {
    await this.processExpiredBookings();
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
    await this.processExpiredBookings();
    const idx = this.bookings.findIndex((b) => b.userId === userId && b.bookingId === bookingId);
    if (idx === -1) return false;
    this.bookings[idx] = { ...this.bookings[idx], status: 'cancelled' };
    return true;
  }

  async processExpiredBookings(): Promise<void> {
    const now = new Date();
    for (const booking of this.bookings) {
      if (booking.status !== 'created') continue;
      const slotTo = new Date(booking.slotTo);
      if (Number.isNaN(slotTo.getTime())) continue;
      if (slotTo <= now) {
        booking.status = 'expired';
        booking.processedAt = new Date().toISOString();
        booking.penaltyBillingCents = 1000; // максимальная эмуляция платежа: 10.00 единиц

        const station = findStationById(booking.stationId);
        if (station) {
          station.state = 'OUT_OF_SERVICE';
          station.occupiedPorts = 0;
          station.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  async getActiveBookingForUserStation(
    userId: string,
    stationId: string,
    at: Date
  ): Promise<BookingDto | null> {
    await this.processExpiredBookings();
    const t = at.getTime();
    for (const b of this.bookings) {
      if (b.userId !== userId || b.stationId !== stationId || b.status !== 'created') continue;
      const from = new Date(b.slotFrom).getTime();
      const to = new Date(b.slotTo).getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) continue;
      if (t >= from && t < to) return b;
    }
    return null;
  }

  async markPaid(userId: string, bookingId: string): Promise<void> {
    await this.processExpiredBookings();
    const idx = this.bookings.findIndex((b) => b.userId === userId && b.bookingId === bookingId);
    if (idx === -1) return;
    const b = this.bookings[idx];
    if (b.status !== 'created') return;
    this.bookings[idx] = {
      ...b,
      status: 'paid',
      processedAt: new Date().toISOString()
    };
  }
}

export function buildBookingsService(): BookingsService {
  return new MockBookingsService();
}
