import { clientBaseQuery } from "@/services/api/clientBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { UserSessionsResponse, UserSessionPortUpdateRequest, UserSessionPortUpdateResponse } from '@/types/sessions';

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: clientBaseQuery,
    tagTypes: ['Session'],
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
    }),
});

export const {
    useGetSessionsQuery,
    useStartBookingMutation,
    useCancelBookingMutation,
    useStartChargingMutation,
    useStopChargingMutation,
} = apiSlice;