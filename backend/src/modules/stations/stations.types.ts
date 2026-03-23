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
  ports: number;
  state: StationState;
  ratePlan?: RatePlan;
  createdAt: string;
  updatedAt: string;
  hasFreePorts?: boolean;
}

export interface LambdaLocation {
  type: string;
  coordinates: [number, number];
}

/** Raw station shape as returned by the Lambda (snake_case / lowercase keys) */
export interface LambdaStation {
  id: string;
  code: string;
  name: string;
  owner: string;
  city: string;
  address: string;
  phone?: string | null;
  email: string | null;
  site_technician?: string | null;
  siteTechnician?: string | null;
  max_power_kw?: number | null;
  maxPowerKw?: number | null;
  ports?: number;
  state?: StationState;
  status?: StationState;
  rate_plan?: RatePlan | null;
  ratePlan?: RatePlan | null;
  created_at: string;
  updated_at: string;
  location?: LambdaLocation;
  has_free_ports?: boolean;
}

export function mapLambdaStation(raw: LambdaStation): StationBase {
  return {
    id: raw.id,
    code: raw.code,
    name: raw.name,
    owner: raw.owner,
    city: raw.city,
    address: raw.address,
    phone: raw.phone ?? null,
    email: raw.email,
    siteTechnician: raw.siteTechnician ?? raw.site_technician ?? null,
    maxPowerKw: raw.maxPowerKw ?? raw.max_power_kw ?? null,
    ports: raw.ports ?? 0,
    state: raw.state ?? raw.status ?? 'INACTIVE',
    ratePlan: raw.ratePlan ?? raw.rate_plan ?? undefined,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    location: raw.location ? {
      latitude: raw.location.coordinates[1],
      longitude: raw.location.coordinates[0],
    } : undefined,
    hasFreePorts: raw.has_free_ports,
  };
}

export function mapLambdaStationList(
  raw: LambdaStation[] | LambdaStation | null | undefined
): StationBase[] {
  if (!raw) {
    return [];
  }

  const stations = Array.isArray(raw) ? raw : [raw];
  return stations.map(mapLambdaStation);
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

export interface LambdaAdminCreateStationResponse {
  station_id: string;
}

export function mapLambdaAdminCreateStationResponse(raw: LambdaAdminCreateStationResponse): AdminCreateStationResponse {
  return {
    stationId: raw.station_id,
  };
}

/** Response for PATCH /admin/stations/{stationId}/state */
export interface AdminUpdateStationStateResponse {
  updatedAt: string;
}

export interface LambdaAdminUpdateStationStateResponse {
  updated_at: string;
}

export function mapLambdaAdminUpdateStationStateResponse(raw: LambdaAdminUpdateStationStateResponse): AdminUpdateStationStateResponse {
  return {
    updatedAt: raw.updated_at,
  };
}

/** Response for DELETE /admin/stations/{stationId} */
export interface AdminDeleteStationResponse {
  deletedAt: string;
}

export interface AdminUpdateStationStateRequest {
  stationId: string;
  oldState: StationState;
  newState: StationState;
}
