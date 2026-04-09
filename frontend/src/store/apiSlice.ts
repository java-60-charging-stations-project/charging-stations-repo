import { clientBaseQuery } from "@/services/api/clientBaseQuery";
import { createApi } from "@reduxjs/toolkit/query/react";
import type { UserSessionsResponse } from '@/types/sessions';

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
    }),
});

export const {
    useGetSessionsQuery,
} = apiSlice;