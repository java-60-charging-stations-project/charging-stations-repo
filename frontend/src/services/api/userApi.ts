import type { ApiArrayResponse, ApiResponse } from "@/types/apiTypes";
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
