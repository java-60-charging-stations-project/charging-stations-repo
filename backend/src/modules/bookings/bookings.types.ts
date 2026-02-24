export interface BookingDto {
  bookingId: string;
  userId: string;
  stationId: string;
  slotFrom: string; // ISO
  slotTo: string;   // ISO
  status: 'created' | 'cancelled';
}

export interface CreateBookingRequest {
  stationId: string;
  slotFrom: string;
  slotTo: string;
}
