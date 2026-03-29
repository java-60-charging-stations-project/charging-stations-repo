import type {
  ApiPort,
  LambdaDeleteDynamoPortSuccessItem,
  LambdaDeleteStationPortsSuccessData,
  LambdaInsertStationPortsSuccessData,
  LambdaPortDynamoRow,
} from '../../common/lambdaContracts';

export type { ApiPort };

/**
 * States allowed for `changeStationState` / RDS transitions
 * (`lambda/db/write/write_station_rds.py` — not DELETED).
 */
export type StationLifecycleState = 'INACTIVE' | 'ACTIVE' | 'OUT_OF_SERVICE';

/**
 * Full station row state (`lambda/.../db_instance_types.py` `StationInstance.state`).
 */
export type StationState = StationLifecycleState | 'DELETED';

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
  portsCount: number;
  occupiedPorts?: number;
  blockedUntil?: string | null;
  state: StationState;
  ratePlan?: RatePlan;
  createdAt: string;
  updatedAt: string;
  hasFreePorts?: boolean;
  ports?: ApiPort[];
}

export interface LambdaLocation {
  type: string;
  coordinates: [number, number];
}

function parseLambdaRatePlan(raw: unknown): RatePlan | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      const o = JSON.parse(raw) as RatePlan;
      if (o && typeof (o as RatePlan).currencyCode === 'string') return o;
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof raw === 'object') return raw as RatePlan;
  return undefined;
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
  /** JSON column may arrive as object or string depending on driver */
  rate_plan?: RatePlan | string | null;
  ratePlan?: RatePlan | string | null;
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
    portsCount: raw.ports ?? 0,
    state: raw.state ?? raw.status ?? 'INACTIVE',
    ratePlan: parseLambdaRatePlan(raw.ratePlan ?? raw.rate_plan ?? undefined),
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

/**
 * Request body for POST /admin/stations.
 * Does not include a port count — new stations start with RDS `ports` as defined by Lambda (default 0); physical ports are managed elsewhere.
 */
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
  location: Location;
  maxPowerKw: number;
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

export interface AdminUpdateStationPortsResponse {
  updatedAt: string;
  portsCount: number;
  occupiedPorts: number;
}

export interface LambdaAdminUpdateStationStateResponse {
  updated_at: string;
}

/** `charging-stations-write-station-rds` — `deleteStation` success payload */
export interface LambdaAdminDeleteStationResponse {
  deleted_at: string;
}

/**
 * `charging-stations-write-station-rds` — `update_station_ports` success payload
 * (array of `{ station_id, delta, event_id }` echoed back).
 */
export interface LambdaUpdateStationPortsOperation {
  station_id: string;
  delta: number;
  event_id: string;
}

export interface LambdaAdminUpdateStationPortsRawResponse {
  operations: LambdaUpdateStationPortsOperation[];
}

/** Pagination meta from `get-station-info` `getAllStations` (snake_case in Lambda JSON). */
export interface LambdaStationsListMeta {
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
}

export function mapLambdaAdminUpdateStationStateResponse(raw: LambdaAdminUpdateStationStateResponse): AdminUpdateStationStateResponse {
  return {
    updatedAt: raw.updated_at,
  };
}

export function mapLambdaDeleteStationResponse(raw: LambdaAdminDeleteStationResponse): AdminDeleteStationResponse {
  return {
    deletedAt: raw.deleted_at,
  };
}

export function mapLambdaStationsListMeta(
  raw: LambdaStationsListMeta | Record<string, unknown> | undefined,
  fallback: Meta
): Meta {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const o = raw as Record<string, unknown>;
  const page = typeof o.page === 'number' ? o.page : fallback.page;
  const pageSize =
    typeof o.page_size === 'number'
      ? o.page_size
      : typeof o.pageSize === 'number'
        ? o.pageSize
        : fallback.pageSize;
  const totalItems =
    typeof o.total_items === 'number'
      ? o.total_items
      : typeof o.totalItems === 'number'
        ? o.totalItems
        : fallback.totalItems;
  const totalPages =
    typeof o.total_pages === 'number'
      ? o.total_pages
      : typeof o.totalPages === 'number'
        ? o.totalPages
        : fallback.totalPages;
  return { page, pageSize, totalItems, totalPages };
}

/** Response for DELETE /admin/stations/{stationId} */
export interface AdminDeleteStationResponse {
  deletedAt: string;
}

export interface AdminUpdateStationStateRequest {
  stationId: string;
  oldState: StationLifecycleState;
  newState: StationLifecycleState;
}

/** Single item inside StationPortsCreateRequest.ports */
export interface AddPortInput {
  portCode: string;
}

/** Request body for POST /support/stations/{stationId}/ports */
export interface AddPortsRequest {
  ports: AddPortInput[];
}

export function mapLambdaPortRow(row: LambdaPortDynamoRow): ApiPort {
  const portId = row.entity_key ?? row.port_id ?? row.code;
  return {
    portId: String(portId),
    portCode: row.code,
    status: row.state,
    lastMeterKw: row.last_meter_kw == null ? 0 : Number(row.last_meter_kw),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
  };
}

export function mapLambdaInsertStationPortsResponse(raw: LambdaInsertStationPortsSuccessData): ApiPort[] | null {
  if (!Array.isArray(raw.created_ports)) {
    return null;
  }
  return raw.created_ports.map(mapLambdaPortRow);
}

export function mapLambdaCreatedPortKeys(raw: LambdaInsertStationPortsSuccessData): string[] {
  if (!Array.isArray(raw.created_port_keys)) {
    return [];
  }
  return raw.created_port_keys
    .filter((value): value is string => typeof value === 'string' && value.length > 0);
}

export function mapLambdaDeleteStationPortsResponse(raw: LambdaDeleteStationPortsSuccessData): LambdaDeleteDynamoPortSuccessItem[] {
  if (!Array.isArray(raw.deleted_ports)) {
    return [];
  }
  return raw.deleted_ports.filter(
    (item): item is LambdaDeleteDynamoPortSuccessItem =>
      Boolean(item) &&
      typeof item.station_id === 'string' &&
      typeof item.port_key === 'string' &&
      typeof item.deleted_at === 'string'
  );
}
