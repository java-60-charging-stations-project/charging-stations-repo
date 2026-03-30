import type { ApiArrayResponse, ApiResponse } from "@/types/apiTypes";
import type {
  Session,
  UserSessionPortUpdateRequest,
  UserSessionPortUpdateResponse,
  UserSessionsResponse,
} from "@/types/sessions";
import type { StationBase, StationsListParams } from "@/types/stations";
import { apiClient } from "./api";

const USER_REQUIRED_PARAMS: StationsListParams = { state: "ACTIVE" };

export async function fetchStations(
  params: StationsListParams,
): Promise<ApiArrayResponse<StationBase>> {
  
  return apiClient.get<ApiArrayResponse<StationBase>>("/user/stations", {
    params: { ...params, ...USER_REQUIRED_PARAMS},
  });
}

export async function fetchStationById(stationId: string): Promise<StationBase> {
  const response = await apiClient.get<ApiResponse<StationBase>>(
    `/user/stations/${stationId}`,
  );

  return response.data;
}

export async function fetchUserSessions(): Promise<Session[]> {
  const response = await apiClient.get<ApiResponse<UserSessionsResponse>>(
    "/sessions/user",
  );

  return response.data.sessions;
}

export async function createBooking(
  payload: UserSessionPortUpdateRequest,
): Promise<UserSessionPortUpdateResponse> {
  const response = await apiClient.post<ApiResponse<UserSessionPortUpdateResponse>>(
    "/sessions/user/booking",
    payload,
  );

  return response.data;
}

export async function startChargingSession(
  payload: UserSessionPortUpdateRequest,
): Promise<UserSessionPortUpdateResponse> {
  const response = await apiClient.post<ApiResponse<UserSessionPortUpdateResponse>>(
    "/sessions/user/charging",
    payload,
  );

  return response.data;
}
