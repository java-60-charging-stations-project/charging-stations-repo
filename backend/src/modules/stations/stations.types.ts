export interface StationDto {
  stationId: string;
  name: string;
  address?: string;
  status?: 'available' | 'busy' | 'offline';
}
