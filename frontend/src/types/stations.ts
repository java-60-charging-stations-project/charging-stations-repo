export type StationState = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_SERVICE';

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
    ratePlan: RatePlan;
    siteTechnician: string | null;
    phone: string | null;
    email: string | null;
};

export interface AdminCreateStationResponse {
    stationId: string;
};

export interface AdminChangeStationStateRequest {
    oldState: StationState;
    newState: StationState;
    updatedAt: string;
};

export interface AdminUpdateStationStateResponse {
    updatedAt: string;
}