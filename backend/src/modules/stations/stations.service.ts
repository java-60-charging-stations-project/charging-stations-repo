import type { StationDto } from './stations.types';

export interface StationsService {
  list(): Promise<StationDto[]>;
  getById(stationId: string): Promise<StationDto | null>;
}

// Placeholder business-logic implementation.
// In production this should call Python Lambdas which read from DynamoDB.
export class MockStationsService implements StationsService {
  private readonly stations: StationDto[] = [
    { stationId: 'st-001', name: 'Demo Station 1', status: 'available' },
    { stationId: 'st-002', name: 'Demo Station 2', status: 'busy' }
  ];

  async list(): Promise<StationDto[]> {
    return this.stations;
  }

  async getById(stationId: string): Promise<StationDto | null> {
    return this.stations.find((s) => s.stationId === stationId) ?? null;
  }
}

export function buildStationsService(): StationsService {
  return new MockStationsService();
}
