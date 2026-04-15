import { clientBaseQuery } from "@/services/api/clientBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { UserSessionsResponse, UserSessionPortUpdateRequest, UserSessionPortUpdateResponse } from '@/types/sessions';
import type { AdminCreateStationRequest, AdminCreateStationResponse, AdminUpdateStationRequest, ChangeStationStateResponse, StationBase, UpdateStationResponse } from "@/types/stations";
import type { UserRole } from "@/types";
import { updateStation } from "@/services/api/supportApi";
import type { ChangeStationStatePayload, GetStationPayload, UpdateStationPayload } from "@/types/rtk_payload";

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
        // STATIONS
        getStation: builder.query<StationBase, GetStationPayload>({
            query: ({ stationId, role }) => {
                const basePath = role === 'ADMIN' ? '/admin' : '/support';
                return {
                    url: `/${basePath}/stations/${stationId}`,
                    method: "GET",
                };
            },
            providesTags: (_result, _error, { stationId }) => [{ type: 'Station', id: stationId }],
        }),
        updateStation: builder.mutation<UpdateStationResponse, UpdateStationPayload>({
            query: ({ stationId, role, body }) => {
                const basePath = role === 'ADMIN' ? '/admin' : '/support';
                return {
                    url: `/${basePath}/stations/${stationId}`,
                    method: "PATCH",
                    data: body,
                };
            }
        }),
        createStation: builder.mutation<AdminCreateStationResponse, AdminCreateStationRequest>({
            query: (body) => ({
                url: "/admin/stations",
                method: "POST",
                data: body,
            }),
        }),
        deleteStation: builder.mutation<AdminCreateStationResponse, string>({
            query: (stationId) => ({
                url: `/admin/stations/${stationId}`,
                method: "DELETE",
            }),
        }),
        changeStationState: builder.mutation<ChangeStationStateResponse, ChangeStationStatePayload>({
            query: ({ role, stationId, body }) => {
                const basePath = role === 'ADMIN' ? '/admin' : '/support';
                return {
                    url: `/${basePath}/stations?${stationId}/state`,
                    method: "PATCH",
                    data: body,
                };
            },
        }),
    }),
});

export const {
    useGetSessionsQuery,
    useStartBookingMutation,
    useCancelBookingMutation,
    useStartChargingMutation,
    useStopChargingMutation,
} = apiSlice;