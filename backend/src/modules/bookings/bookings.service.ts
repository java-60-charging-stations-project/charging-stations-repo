import type { BookingDto, CreateBookingRequest } from './bookings.types';
import { findStationById } from '../stations/local/stations.service.local';

export interface BookingsService {
  listForUser(userId: string): Promise<BookingDto[]>;
  /** Одна бронь пользователя по id; чужая или несуществующая → `null` */
  getForUser(userId: string, bookingId: string): Promise<BookingDto | null>;
  create(userId: string, req: CreateBookingRequest): Promise<BookingDto>;
  cancel(userId: string, bookingId: string): Promise<boolean>;
  processExpiredBookings(): Promise<void>;
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

  async getForUser(userId: string, bookingId: string): Promise<BookingDto | null> {
    await this.processExpiredBookings();
    const b = this.bookings.find((x) => x.userId === userId && x.bookingId === bookingId);
    return b ?? null;
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
}

export function buildBookingsService(): BookingsService {
  return new MockBookingsService();
}
