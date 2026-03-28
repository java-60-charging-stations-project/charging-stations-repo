export type StationState = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_SERVICE' | 'DELETED';

export interface RatePlan {
    currencyCode: string;
    currencyName: string;
    peakRate: number;
    offPeakRate: number; 
};

export interface Location {
    latitude: number;
    longitude: number;
};
export interface StationBase {
    id: string;
    code: string;
    name: string;
    owner: string;
    city: string;
    address: string;
    phone: string | null;
    email: string | null;
    siteTechnician: string | null;
    location?: Location;
    maxPowerKw: number | null;
    ports: number;
    occupiedPorts?: number;
    blockedUntil?: string | null;
    state: StationState;
    ratePlan?: RatePlan;
    createdAt: string;
    updatedAt: string;
};

export interface AdminCreateStationRequest {
    code: string;
    name: string;
    owner: string;
    city: string;
    address: string;
    location: Location;
    maxPowerKw: number;
    ratePlan: RatePlan;
    siteTechnician: string | null;
    phone: string | null;
    email: string | null;
};

export interface AdminCreateStationResponse {
    stationId: string;
};

export interface ChangeStationStateRequest {
    oldState: StationState;
    newState: StationState;
    updatedAt: string;
};

export interface ChangeStationStateResponse {
    updatedAt: string;
}

export interface StationsListParams {
    city?: string;
    owner?: string;
    state?: StationState;
    orderBy?: string;
    page?: number;
    pageSize?: number;
  }