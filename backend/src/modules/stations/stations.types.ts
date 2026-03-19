/** Station state per API spec (GET /stations, /admin/stations) */
export type StationState = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_SERVICE';

/** ISO 4217 currency code, peak/off-peak rates */
export interface RatePlan {
  currencyCode: string;
  currencyName: string;
  peakRate: number;
  offPeakRate: number;
}

/** Geographic coordinates */
export interface Location {
  latitude: number;
  longitude: number;
}

/** Station as returned by GET /stations, /stations/{id}, /admin/stations, /admin/stations/{id} */
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
}

/** Pagination metadata for collection responses */
export interface Meta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Response for GET /stations, GET /admin/stations, GET /welcome */
export interface StationBaseCollectionResponse {
  data: StationBase[];
  meta: Meta;
}

/** Response for GET /stations/{id}, GET /admin/stations/{id} */
export interface StationBaseSingleResponse {
  data: StationBase;
}

/** Request body for POST /admin/stations */
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
}

export interface AdminCreateStationResponse {
  stationId: string;
}

/** Response for PATCH /admin/stations/{stationId}/state */
export interface AdminUpdateStationStateResponse {
  updatedAt: string;
}

export interface StationsService {
  list(callerId: string): Promise<StationBase[]>;
  getById(stationId: string, callerId: string): Promise<StationBase>;
  create(payload: AdminCreateStationRequest, callerId: string): Promise<AdminCreateStationResponse>;
  updateStatus(
    stationId: string,
    status: StationState,
    callerId: string,
    callerGroups: string[]
  ): Promise<StationBase>;
  updateStationState(
    stationId: string,
    oldState: StationState,
    newState: StationState,
    callerId: string
  ): Promise<AdminUpdateStationStateResponse>;
}

