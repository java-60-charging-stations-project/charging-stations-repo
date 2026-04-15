import type { UserRole } from ".";
import type { AdminUpdateStationRequest, ChangeStationStateRequest, StationPortsCreateRequest } from "./stations";

export type GetStationPayload = {
    stationId: string;
    role: UserRole;
};

export type UpdateStationPayload = {
    stationId: string;
    role: UserRole;
    body: AdminUpdateStationRequest;
};

export type ChangeStationStatePayload = {
    stationId: string;
    role: UserRole;
    body: ChangeStationStateRequest;
};

export type AddStationPortsPayload = {
    stationId: string;
    body: StationPortsCreateRequest;
};

export type DeleteStationPortPayload = {
    stationId: string;
    portId: string;
};