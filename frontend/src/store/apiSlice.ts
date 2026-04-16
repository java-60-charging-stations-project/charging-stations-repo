import { clientBaseQuery } from "@/services/api/clientBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { Session, UserSessionsResponse, UserSessionPortUpdateRequest, UserSessionPortUpdateResponse, UserSessionPaymentResponse, UserSessionPaymentRequest } from '@/types/sessions';
import type { AdminCreateStationRequest, AdminCreateStationResponse, ChangeStationStateResponse, StationBase, StationPortsCreateResponse, StationPortsListResponse, SupportUpdatePortStateResponse, UpdateStationResponse } from "@/types/stations";
import type { AddStationPortsPayload, ChangeStationStatePayload, DeleteStationPortPayload, GetStationPayload, UpdateStationPayload, UpdateStationPortStatePayload } from "@/types/rtk_payload";
import type { UserRole } from "@/types";

function buildRolePath(role: UserRole): string {
    return role === 'ADMIN' ? '/admin' : '/support';
}

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: clientBaseQuery,
    tagTypes: ["Session", "Station"],
    endpoints: builder => ({
        getSessions: builder.query<UserSessionsResponse, void>({
            query: () => ({
                url: "/sessions/user",
                method: "GET",
            }),
            providesTags: ['Session'],
        }),
        getCompletedSessions: builder.query<Session[], void>({
            query: () => ({
                url: "/sessions/user",
                method: "GET",
                params: {latest: true},
            }),
            transformResponse: (response: UserSessionsResponse): Session[] => {
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
            invalidatesTags: ['Session'],
        }),
        cancelBooking: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/booking/stop",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ['Session'],
        }),
        startCharging: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/charging",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ['Session'],
        }),
        stopCharging: builder.mutation<UserSessionPortUpdateResponse, UserSessionPortUpdateRequest>({
            query: (body) => ({
                url: "/sessions/user/charging/stop",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ['Session'],
        }),
        payManually: builder.mutation<UserSessionPaymentResponse, UserSessionPaymentRequest>({
            query: (body) => ({
                url: "/sessions/user/manual-payment",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ['Session'],
        }),
        // STATIONS
        getStation: builder.query<StationBase, GetStationPayload>({
            query: ({ stationId, role }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}`,
                method: "GET",
            }),
            providesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStation: builder.mutation<UpdateStationResponse, UpdateStationPayload>({
            query: ({ stationId, role, body }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}`,
                method: "PATCH",
                data: body,
            }),
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStationState: builder.mutation<ChangeStationStateResponse, ChangeStationStatePayload>({
            query: ({ role, stationId, body }) => ({
                url: `${buildRolePath(role)}/stations/${stationId}/state`,
                method: "PATCH",
                data: body,
            }),
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        // CREATE AND DELETE STATIONS (admin-only)
        createStation: builder.mutation<AdminCreateStationResponse, AdminCreateStationRequest>({
            query: (body) => ({
                url: "/admin/stations",
                method: "POST",
                data: body,
            }),
        }),
        deleteStation: builder.mutation<void, string>({
            query: (stationId) => ({
                url: `/admin/stations/${stationId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, stationId) => [{ type: 'Station', id: stationId }],
        }),
        // STATION PORTS (support-only)
        getStationPorts: builder.query<StationPortsListResponse, string>({
            query: (stationId) => ({
                url: `/support/stations/${stationId}/ports`,
                method: "GET",
            }),
            providesTags: (_result, _error, stationId) => [{ type: 'Station', id: stationId }],
        }),
        addStationPorts: builder.mutation<StationPortsCreateResponse, AddStationPortsPayload>({
            query: ({ stationId, body }) => ({
                url: `/support/stations/${stationId}/ports`,
                method: "POST",
                data: body,
            }),
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
            invalidatesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
    }),
});

export const {
    // SESSIONS
    useGetSessionsQuery,
    useGetCompletedSessionsQuery,
    useStartBookingMutation,
    useCancelBookingMutation,
    useStartChargingMutation,
    useStopChargingMutation,
    usePayManuallyMutation,
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