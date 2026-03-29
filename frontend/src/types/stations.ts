export type StationState = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_SERVICE' | 'DELETED';

// PORTS
export type PortState = 'DISABLED' | 'FREE' | 'BOOKED' | 'OCCUPIED' | 'ERROR';

export type StationPort = {
    portId: string,
    portCode: string,
    status: PortState,
    lastMeterKw: number,
    createdAt: string,
    updatedAt: string,
};

// PORTS CREATE
export type StationPortCreate = {
    portCode: string,
};

export type StationPortsCreateRequest = {
    ports: StationPortCreate[],
};

export type StationPortsCreateResponse = {
    ports: StationPort[],
};

export type StationPortsListResponse = {
    ports: StationPort[],
};

export type RatePlan ={
    currencyCode: string;
    currencyName: string;
    peakRate: number;
    offPeakRate: number; 
};

export type GeoLocation = {
    latitude: number;
    longitude: number;
};

export type StationBase = {
    id: string;
    code: string;
    name: string;
    owner: string;
    city: string;
    address: string;
    phone: string | null;
    email: string | null;
    siteTechnician: string | null;
    location?: GeoLocation;
    maxPowerKw: number | null;
    portsCount: number;
    state: StationState;
    ratePlan?: RatePlan;
    createdAt: string;
    updatedAt: string;
    ports?: StationPort[];
};

export type AdminCreateStationRequest = {
    code: string;
    name: string;
    owner: string;
    city: string;
    address: string;
    location: GeoLocation;
    maxPowerKw: number;
    ratePlan: RatePlan;
    siteTechnician: string | null;
    phone: string | null;
    email: string | null;
};

export type AdminCreateStationResponse = {
    stationId: string;
};

export type ChangeStationStateRequest = {
    oldState: StationState;
    newState: StationState;
    updatedAt: string;
};

export type ChangeStationStateResponse = {
    updatedAt: string;
};

export type StationsListParams = {
    city?: string;
    owner?: string;
    state?: StationState;
    orderBy?: string;
    page?: number;
    pageSize?: number;
};