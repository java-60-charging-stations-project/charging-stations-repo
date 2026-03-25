import type { BookingDto, CreateBookingRequest } from './bookings.types';
import { updateStationStateLocal, findStationById } from '../stations/local/stations.service.local';
import { createLogger } from '../../utils/logger';

export interface BookingsService {
  listForUser(userId: string): Promise<BookingDto[]>;
  create(userId: string, req: CreateBookingRequest): Promise<BookingDto>;
  cancel(userId: string, bookingId: string): Promise<boolean>;
  processExpiredBookings(): Promise<void>;
  getActiveBookingForUserStation(userId: string, stationId: string, at?: Date): Promise<BookingDto | null>;
  markPaid(userId: string, bookingId: string): Promise<boolean>;
}

const logger = createLogger('bookings.service');

export class MockBookingsService implements BookingsService {
  private bookings: BookingDto[] = [];

  constructor() {
    setInterval(() => {
      this.processExpiredBookings().catch((err) => {
        logger.error('failed processing expired bookings', { error: err instanceof Error ? err.message : String(err) });
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

  async getActiveBookingForUserStation(userId: string, stationId: string, at: Date = new Date()): Promise<BookingDto | null> {
    await this.processExpiredBookings();
    const now = at.getTime();
    for (const booking of this.bookings) {
      if (booking.userId !== userId) continue;
      if (booking.stationId !== stationId) continue;
      if (booking.status !== 'created') continue;
      const from = new Date(booking.slotFrom).getTime();
      const to = new Date(booking.slotTo).getTime();
      if (Number.isNaN(from) || Number.isNaN(to)) continue;
      if (from <= now && now <= to) return booking;
    }
    return null;
  }

  async markPaid(userId: string, bookingId: string): Promise<boolean> {
    const idx = this.bookings.findIndex((b) => b.userId === userId && b.bookingId === bookingId);
    if (idx === -1) return false;
    const cur = this.bookings[idx];
    if (cur.status !== 'created') return false;
    this.bookings[idx] = { ...cur, status: 'paid', processedAt: new Date().toISOString() };
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
        // Эмуляция оплаты по максимальному тарифу станции (best-effort в mock/local).
        const station = findStationById(booking.stationId);
        const maxRate = station?.ratePlan ? Math.max(station.ratePlan.peakRate, station.ratePlan.offPeakRate) : null;
        // Штраф: считаем 10 kWh по maxRate (в центах); если тариф неизвестен — 1000 центов как fallback.
        booking.penaltyBillingCents = maxRate !== null ? Math.round(maxRate * 10 * 100) : 1000;
        logger.warn('booking expired, applying penalty and blocking station', {
          bookingId: booking.bookingId,
          stationId: booking.stationId,
          penaltyBillingCents: booking.penaltyBillingCents,
        });

        if (station) {
          station.state = 'INACTIVE';
          station.occupiedPorts = 0;
          station.updatedAt = new Date().toISOString();
        }
      }
    }
  }
}

let singleton: MockBookingsService | null = null;
export function buildBookingsService(): BookingsService {
  if (!singleton) singleton = new MockBookingsService();
  return singleton;
}
