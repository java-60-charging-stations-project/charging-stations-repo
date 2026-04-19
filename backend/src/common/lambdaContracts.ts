/**
 * TypeScript-зеркало контрактов Lambda.
 */

export type LambdaGlobalErrorCode =
  | 'UNHANDLED_ERROR'
  | 'ALREADY_EXISTS'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST'
  | 'CONSTRAINT_VIOLATION'
  | 'DATABASE_ERROR'
  | 'INVALID_STATE';

export type LambdaErrorCode = LambdaGlobalErrorCode | string;

export interface LambdaSuccessPayload<TData = unknown, TMeta = Record<string, unknown> | null> {
  data: TData;
  meta?: TMeta;
}

export interface LambdaErrorPayload {
  error: string;
  code?: LambdaErrorCode;
}

export interface LambdaServiceEnvelope<TData = unknown, TMeta = unknown, TAction extends string = string> {
  service: {
    action: TAction;
    callerId: string;
  };
  data?: TData;
  meta?: TMeta;
}

export interface LambdaPaginationMeta {
  page?: number;
  pageSize?: number;
}

export function isLambdaErrorPayload(value: unknown): value is LambdaErrorPayload {
  if (!value || typeof value !== 'object') return false;
  if (!('error' in value)) return false;
  if ('data' in value) return false;

  return typeof (value as LambdaErrorPayload).error === 'string';
}

// Users

export type LambdaUserRole = 'USER' | 'ADMIN' | 'SUPPORT';
export type LambdaUserStatus = 'ACTIVE' | 'BANNED' | 'DISABLED';

export interface LambdaUserRow {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: LambdaUserRole;
  status: LambdaUserStatus;
  created_at: string;
  updated_at: string;
}

export type LambdaUserReadAction = 'getUserById' | 'getAllUsers';

export interface LambdaGetUserByIdRequest
  extends LambdaServiceEnvelope<{ userId: string }, never, 'getUserById'> {}

export interface LambdaGetAllUsersRequest
  extends LambdaServiceEnvelope<Record<string, never> | undefined, LambdaPaginationMeta, 'getAllUsers'> {}

// Stations read

export type LambdaStationState = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_SERVICE' | 'DELETED';

export interface LambdaGetAllStationsFilters {
  city?: string | null;
  owner?: string | null;
  state?: LambdaStationState;
  orderBy?: string;
}

export interface LambdaGetAllStationsResponseMeta {
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
}

export interface LambdaGeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

export interface LambdaRatePlan {
  currencyCode: string;
  currencyName: string;
  peakRate: number;
  offPeakRate: number;
}

export interface LambdaStationRow {
  id: string;
  code: string;
  name: string;
  owner: string;
  city: string;
  address: string;
  email: string | null;
  site_technician: string | null;
  max_power_kw: number;
  ports: number;
  rate_plan: LambdaRatePlan;
  state: LambdaStationState;
  has_free_ports: boolean;
  location: LambdaGeoJsonPoint;
  created_at: string;
  updated_at: string;
}

export type LambdaStationReadAction = 'getAllStations' | 'getStationById';

export interface LambdaGetAllStationsRequest
  extends LambdaServiceEnvelope<LambdaGetAllStationsFilters, LambdaPaginationMeta, 'getAllStations'> {}

export interface LambdaGetStationByIdRequest
  extends LambdaServiceEnvelope<{ stationId: string }, never, 'getStationById'> {}

// Stations write RDS

export type LambdaStationWriteRdsAction =
  | 'writeStation'
  | 'changeStationState'
  | 'deleteStation'
  | 'update_station_ports';

/** Payload for `writeStation` from the API — do not send `ports`; Lambda uses `data.get("ports", 0)` internally. */
export interface LambdaWriteStationRequestData {
  code: string;
  name: string;
  owner: string;
  city: string;
  address: string;
  email: string | null;
  phone: string | null;
  siteTechnician: string | null;
  ratePlan: LambdaRatePlan;
  location: { longitude: number; latitude: number };
  state?: Exclude<LambdaStationState, 'DELETED'>;
  maxPowerKw?: number;
}

export interface LambdaWriteStationSuccessData {
  station_id: string;
}

export interface LambdaChangeStationStateData {
  stationId: string;
  oldState: Exclude<LambdaStationState, 'DELETED'>;
  newState: Exclude<LambdaStationState, 'DELETED'>;
}

export interface LambdaChangeStationStateSuccessData {
  updated_at: string;
}

export interface LambdaDeleteStationData {
  stationId: string;
}

export interface LambdaDeleteStationSuccessData {
  deleted_at: string;
}

export interface LambdaUpdateStationPortsOperation {
  station_id: string;
  delta: number;
  event_id: string;
}

export interface LambdaStreamForwardedPortOperation {
  event_id: string;
  station_id: string;
  entity_key: string;
  operation: 'INSERT' | 'REMOVE';
  delta: number;
}

/**
 * Прямой invoke `update_station_ports` из API: `event.data` — массив.
 * Ответ успеха: `{ data: { operations: тем же массивом } }`.
 */
export type LambdaUpdateStationPortsApiPayload = LambdaUpdateStationPortsOperation[];

/**
 * Invoke из stream consumer: тот же `action`, но элементы содержат поля Dynamo (см. `stations_dynamo_stream_consumer.py`).
 * `write_station_rds` читает только `station_id`, `delta`, `event_id`.
 */
export type LambdaUpdateStationPortsStreamPayload = LambdaStreamForwardedPortOperation[];

// --- Ports: read Lambda (`getPortsByStation`) — `get_ports_sessions_dynamo.py` ---

export type LambdaPortsReadAction = 'getPortsByStation' | 'getSessionByUser' | 'getSessionByStation';

export interface LambdaGetPortsByStationInvokeData {
  stationId: string;
}

export interface LambdaGetSessionByUserInvokeData {
  userId: string;
  latest?: boolean;
}

export interface LambdaGetSessionByStationInvokeData {
  stationId: string;
}

export type LambdaPortState =
  | 'FREE'
  | 'OCCUPIED'
  | 'ERROR'
  | 'DISABLED'
  | 'BOOKED';

/**
 * Элемент `data.ports[]` в ответе Lambda (JSON snake_case, см. `db_instance_types.PortInstance` + `port_id` при записи).
 */
export interface LambdaPortDynamoRow {
  station_id: string;
  /** Sort key, напр. `PORT#<code>` */
  entity_key: string | null;
  /**
   * Код порта на станции (уникален в рамках станции в модели).
   */
  code?: string;
  port_id?: string;
  state: LambdaPortState;
  last_meter_kw: number | null;
  created_at: string | null;
  updated_at: string | null;
  last_event_id?: string | null;
}

export interface LambdaGetPortsByStationSuccessData {
  ports: LambdaPortDynamoRow[];
}

// --- Ports: write Lambda — `write_ports_sessions_dynamo.py` ---

export type LambdaWritePortsDynamoAction =
  | 'insertStationPorts'
  | 'supportUpdateStationPorts'
  | 'userUpdateStationPorts'
  | 'deleteStationPorts'
  | 'create_session';

/**
 * `insertStationPorts`: для каждого порта в `build_port_item` нужны `code` и `lastMeterKw` (camelCase в `event.data`).
 */
export interface LambdaInsertStationPortInput {
  code: string;
  lastMeterKw: number;
}

export interface LambdaInsertStationPortsData {
  stationId: string;
  ports: LambdaInsertStationPortInput[];
}

/** Invoke: `service.action === 'getPortsByStation'`. */
export interface LambdaGetPortsByStationRequest
  extends LambdaServiceEnvelope<LambdaGetPortsByStationInvokeData, Record<string, never>, 'getPortsByStation'> {}

/** Invoke: `service.action === 'getSessionByUser'`. */
export interface LambdaGetSessionByUserRequest
  extends LambdaServiceEnvelope<LambdaGetSessionByUserInvokeData, Record<string, never>, 'getSessionByUser'> {}

/** Invoke: `service.action === 'getSessionByStation'`. */
export interface LambdaGetSessionByStationRequest
  extends LambdaServiceEnvelope<LambdaGetSessionByStationInvokeData, Record<string, never>, 'getSessionByStation'> {}

/** Invoke: `service.action === 'insertStationPorts'`. */
export interface LambdaInsertStationPortsRequest
  extends LambdaServiceEnvelope<LambdaInsertStationPortsData, Record<string, never>, 'insertStationPorts'> {}

/**
 * Рекомендуемый контракт HTTP API (camelCase) после маппинга из `LambdaPortDynamoRow`:
 * `portId` ← `entity_key` (или `port_id`, если договоритесь), `portCode` ← `code`, `status` ← `state`.
 */
export interface ApiPort {
  portId: string;
  portCode: string;
  status: LambdaPortState;
  lastMeterKw: number;
  createdAt: string;
  updatedAt: string;
}

export interface LambdaUpdateDynamoPortsData {
  stationId: string;
  ports: string[];
  oldState: LambdaPortState;
  newState: LambdaPortState;
}

/** `supportUpdateStationPorts` — `write_ports_sessions_dynamo.py` */
export interface LambdaSupportUpdateStationPortsData {
  stationId: string;
  portCode: string;
  oldState: LambdaPortState;
  newState: LambdaPortState;
}

/** Success payload (snake_case from Lambda) */
export interface LambdaSupportUpdateStationPortsSuccessData {
  station_id: string;
  entity_key: string;
  new_state: string;
  updated_at: string;
}

export interface LambdaDeleteStationPortsData {
  stationId: string;
  portKey: string;
}

export interface LambdaInsertStationPortsSuccessData {
  created_ports?: LambdaPortDynamoRow[];
  created_port_keys?: string[];
}

export interface LambdaUpdateDynamoPortsSuccessItem {
  station_id: string;
  port_key: string;
  new_state: string;
  updated_at: string;
}

export interface LambdaDeleteDynamoPortSuccessItem {
  station_id: string;
  port_key: string;
  deleted_at: string;
}
// Special cases

/** Health Lambda не использует общий service envelope. */
export interface LambdaHealthResponse {
  code: number;
  status: string;
}

export interface LambdaConfirmConsoleCreatedAdminRequest {
  username: string;
  password: string;
  new_password?: string;
  user_id?: string;
  trigger?: string;
}

export interface LambdaConfirmConsoleCreatedAdminResponse {
  message: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
}

export interface LambdaCreateRdsTablesResponse {
  message: string;
}

/** RDS logs read — `lambda/db/read/get_logs_info.py`, action `getLogs`. */

export type LambdaLogsReadAction = 'getLogs';

/** Filters in `event.data` (camelCase); `callerId` filters column `caller_id`. */
export interface LambdaGetLogsFilterData {
  level?: string;
  service?: string;
  callerId?: string;
  event?: string;
  resolved?: boolean | string;
  /** Comma-separated tokens; each field uses suffix `+` / `-` for ASC/DESC (see `SORTABLE_COLUMNS` in Lambda). */
  orderBy?: string;
  /** ISO 8601 with offset; filters `logs.timestamp >= dateFrom`. */
  dateFrom?: string;
  /** ISO 8601 with offset; filters `logs.timestamp <= dateTo`. */
  dateTo?: string;
}

export interface LambdaGetLogsRequestMeta {
  page?: number;
  pageSize?: number;
}

/** Pagination meta returned by read Lambda (`total_items`, snake_case). */
export interface LambdaGetLogsResponseMeta {
  total_items: number;
  total_pages: number;
  page: number;
  page_size: number;
}

/** RDS logs write — `lambda/db/write/write_logs_rds.py`. */

export type LambdaLogsWriteAction = 'write_logs' | 'resolveLog';

/** `resolveLog`: only `logId`; resolver is `event.service.callerId`. */
export interface LambdaResolveLogData {
  logId: string;
}

export interface LambdaResolveLogSuccessData {
  logId: string;
  resolverId: string;
  /** ISO datetime string from Lambda JSON. */
  resolveTime: string;
}

export type LambdaCollectorLogAudience = 'support' | 'admin';

/** @deprecated Use `LambdaGetLogsFilterData` + action `getLogs`. */
export interface LambdaResolveCollectorLogData {
  logId: string;
  resolveTime: string;
  resolverId: string;
  audience: LambdaCollectorLogAudience;
}

/** @deprecated Use `LambdaGetLogsFilterData` + `getLogs` meta pagination. */
export interface LambdaListCollectorLogsData {
  audience: LambdaCollectorLogAudience;
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}

// Backward compatibility

/** @deprecated Используй LambdaUserRow */
export type LambdaUserInstance = LambdaUserRow;

/** @deprecated Используй LambdaGlobalErrorCode */
export type LambdaContractErrorCode = LambdaGlobalErrorCode;