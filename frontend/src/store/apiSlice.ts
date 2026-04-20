import { clientBaseQuery } from "@/services/api/clientBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { Session, UserSessionsResponse, UserSessionPortUpdateRequest, UserSessionPortUpdateResponse, UserSessionPaymentResponse, UserSessionPaymentRequest } from '@/types/sessions';
import type { AdminCreateStationRequest, AdminCreateStationResponse, ChangeStationStateResponse, StationBase, StationPortsCreateResponse, StationPortsListResponse, SupportUpdatePortStateResponse, UpdateStationResponse } from "@/types/stations";
import type { AddStationPortsPayload, ChangeStationStatePayload, DeleteStationPortPayload, GetStationPayload, UpdateStationPayload, UpdateStationPortStatePayload } from "@/types/rtk_payload";
import type { UserRole } from "@/types";
import type { ApiArrayResponse, ApiResponse } from "@/types/apiTypes";
import type { LogRecord, LogRequest, LogResolveRequest } from "@/types/logs";
import { createSelector } from "@reduxjs/toolkit";
import type { AppStartListening } from "./listenerMiddleware";
import { getLogger } from "@/services/logging";
import { isFreshUnpaidSession, isStaleUnpaidSession } from "@/utils/sessionStatus";

const logger = getLogger("apiSlice");


export function unwrapData<T>(response: ApiResponse<T>): T {
  return response.data;
};

function buildRolePath(role: UserRole): string {
    return role === 'ADMIN' ? '/admin' : '/support';
};

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: clientBaseQuery,
    tagTypes: ["Session", "Station", "Log"],
    endpoints: builder => ({
        getSessions: builder.query<UserSessionsResponse, void>({
            query: () => ({
                url: "/sessions/user",
                method: "GET",
            }),
            transformResponse: unwrapData,
            providesTags: ['Session'],
        }),
        getCompletedSessions: builder.query<Session[], void>({
            query: () => ({
                url: "/sessions/user",
                method: "GET",
                params: {latest: true},
            }),
            transformResponse: (rawResponse: ApiResponse<UserSessionsResponse>): Session[] => {
                const response = unwrapData(rawResponse);
                const stateOrder: Record<string, number> = { UNPAID: 0, PAID: 1 };
                return response.sessions
                    .filter(s => s.state === "PAID" || s.state === "UNPAID")
                    .sort((a, b) => {
                        const statesDiff = stateOrder[a.state] - stateOrder[b.state];
                        if (statesDiff !== 0) return statesDiff;
                        return new Date(b.endedAt ?? 0).getTime() - new Date(a.endedAt ?? 0).getTime();
                    });
            },
            providesTags: ['Session'],
        }),
        startBooking: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/booking",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: ['Session'],
        }),
        cancelBooking: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/booking/stop",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: ['Session'],
        }),
        startCharging: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/charging",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: ['Session'],
        }),
        stopCharging: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/charging/stop",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: ['Session'],
        }),
        payManually: builder.mutation<UserSessionPaymentResponse, UserSessionPaymentRequest>({
            query: (body) => ({
                url: "/sessions/user/manual-payment",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: ['Session'],
        }),
        // Logs
        getLogs: builder.query<ApiArrayResponse<LogRecord>, LogRequest>({
            query: ({ role, page, pageSize, filterParams={} }: LogRequest) => ({
                method: "GET",
                url: `/logs${buildRolePath(role)}`,
                params: {page, pageSize,...filterParams},
            }),
            providesTags: ["Log"],
        }),
        resolveLog: builder.mutation<LogRecord, LogResolveRequest>({
            query: ({role, resolve_time, log_id}) => ({
                method: "POST",
                url: `/logs${buildRolePath(role)}/${log_id}`,
                data: {resolve_time},
            }),
            transformResponse: unwrapData,
            invalidatesTags: ["Log"],
        }),
        // STATIONS
        getStation: builder.query<StationBase, GetStationPayload>({
            query: ({ stationId, role }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}`,
                method: "GET",
            }),
            transformResponse: unwrapData,
            providesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStation: builder.mutation<UpdateStationResponse, UpdateStationPayload>({
            query: ({ stationId, role, body }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}`,
                method: "PATCH",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStationState: builder.mutation<ChangeStationStateResponse, ChangeStationStatePayload>({
            query: ({ role, stationId, body }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}/state`,
                method: "PATCH",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        // CREATE AND DELETE STATIONS (admin-only)
        createStation: builder.mutation<AdminCreateStationResponse, AdminCreateStationRequest>({
            query: (body) => ({
                url: "/admin/stations",
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
        }),
        deleteStation: builder.mutation<void, string>({
            query: (stationId) => ({
                url: `/admin/stations/${stationId}`,
                method: "DELETE",
            }),
            transformResponse: unwrapData,
            invalidatesTags: (_result, _error, stationId) => [{ type: 'Station', id: stationId }],
        }),
        // STATION PORTS (support-only)
        getStationPorts: builder.query<StationPortsListResponse, string>({
            query: (stationId) => ({
                url: `/support/stations/${stationId}/ports`,
                method: "GET",
            }),
            transformResponse: unwrapData,
            providesTags: (_result, _error, stationId) => [{ type: 'Station', id: stationId }],
        }),
        addStationPorts: builder.mutation<StationPortsCreateResponse, AddStationPortsPayload>({
            query: ({ stationId, body }) => ({
                url: `/support/stations/${stationId}/ports`,
                method: "POST",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        deleteStationPort: builder.mutation<void, DeleteStationPortPayload>({
            query: ({ stationId, portId }) => ({
                url: `/support/stations/${stationId}/ports/${portId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStationPortState: builder.mutation<SupportUpdatePortStateResponse, UpdateStationPortStatePayload>({
            query: ({ stationId, body }) => ({
                url: `/support/stations/${stationId}/ports/state`,
                method: "PATCH",
                data: body,
            }),
            transformResponse: unwrapData,
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
    }),
});

// Selectors
export const selectActiveSessionStateSelector = createSelector(
    apiSlice.endpoints.getSessions.select(undefined),
    (selected) => {
        return selected.data?.sessions[0] ?? null;
    }
);

// Middleware
function isUnchanged(prev: Session | null, curr: Session | null): boolean {
    return (prev?.state === curr?.state && prev?.chargeLevelPercent === prev?.chargeLevelPercent);
};
function isPaymentFailed(prev: Session | null, curr: Session | null): boolean {
    return  isFreshUnpaidSession(prev) && isStaleUnpaidSession(curr);
}
function isBookingExpired(prev: Session | null, curr: Session | null): boolean {
    if (
        ( prev !== null && prev.state === "BOOKED" ) &&
        ( curr === null || curr.state === "UNPAID" || curr.state === "PAID" )
    ) {
        return true;
    }

    return false;
};
function isChargeCompleted(prev: Session | null, curr: Session | null): boolean {
    const prevPct = prev === null? 0: (prev.chargeLevelPercent ?? 0);
    return (curr !== null && curr.state === "ACTIVE" && curr.chargeLevelPercent === 100 && prevPct < 100);
};

export const addSessionStateListener = (appListening: AppStartListening) => {
    appListening({
        matcher: apiSlice.endpoints.getSessions.matchFulfilled,
        effect: async (_action, listenerApi) => {
            const prev = selectActiveSessionStateSelector(listenerApi.getOriginalState());
            const curr = selectActiveSessionStateSelector(listenerApi.getState());
            logger.debug(`Effect is running, prevState = ${prev?.state}, currState=${curr?.state}`);
            if ( isUnchanged(prev, curr) ) {
                return;
            }
            const { toast } = await import("react-toastify");
            const position = "bottom-right";
            const className = "p-0 w-100 border border-purple-600/40";
            const autoClose = 5000;
            
            if ( isBookingExpired(prev, curr) ) {
                toast.warn("Your booking has expired", {
                    toastId: "session-expired", position, className, autoClose,
                });
            }
            else if ( isChargeCompleted(prev, curr) ) {
                toast.success(
                    "Your charging is complete", {
                    toastId: "charging-completed", position, className, autoClose,
                });
            }
            else if (isPaymentFailed(prev, curr)) {
                toast.error(
                    "Your payment has failed!", {
                    toastId: "payment-failed", position, className, autoClose,   
                });
            }
        },
    });
};

export const {
    // SESSIONS
    useGetSessionsQuery,
    useGetCompletedSessionsQuery,
    useStartBookingMutation,
    useCancelBookingMutation,
    useStartChargingMutation,
    useStopChargingMutation,
    usePayManuallyMutation,
    // LOGS
    useGetLogsQuery,
    useResolveLogMutation,
    // STATIONS
    useGetStationQuery,
    useUpdateStationMutation,
    useUpdateStationStateMutation,
    useCreateStationMutation,
    useDeleteStationMutation,
    useGetStationPortsQuery,
    useAddStationPortsMutation,
    useDeleteStationPortMutation,
    useUpdateStationPortStateMutation,
} = apiSlice;