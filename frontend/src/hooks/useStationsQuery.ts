import type { ApiArrayResponse, ApiMetadata } from "@/types/apiTypes";
import type { StationBase, StationsListParams, StationState } from "@/types/stations";
import { DEFAULT_PAGE_SIZE } from "@/types/constants";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";


export function useStationsQuery(
    fetchMethod: (params: StationsListParams) => Promise<ApiArrayResponse<StationBase>>
) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [stations, setStations] = useState<StationBase[]>([]);
    const [meta, setMeta] = useState<ApiMetadata | null>(null);
    const [refreshToken, setRefreshToken] = useState(0);
    
    const [searchParams, setSearchParams] = useSearchParams();
    const city = searchParams.get('city') ?? undefined;
    const owner = searchParams.get('owner') ?? undefined;
    const state = (searchParams.get('state') ?? undefined) as StationState | undefined;
    const orderBy = searchParams.get('orderBy') ?? undefined;
    const page = Number(searchParams.get('page') ?? "1") || 1;
    const pageSize = Number(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE)) || DEFAULT_PAGE_SIZE;

    const refresh = () => setRefreshToken(c => c + 1);
    
    useEffect(() => {
        let isCancelled = false;
        const fetchStations = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetchMethod({city, owner, state, orderBy, page, pageSize});
                if (!isCancelled) {
                    setStations(response.data);
                    setMeta(response.meta);
                }
            } catch (error) {
                if (!isCancelled) {
                    setError(error as Error);
                }
            } finally {
                if (!isCancelled) { 
                    setIsLoading(false);
                }
            }
        };
        fetchStations();
        return () => { isCancelled = true; };
    }, [city, owner, state, orderBy, page, pageSize, refreshToken, fetchMethod]);

    const setPage = (page: number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('page', String(page));
            return next;
        });
    };

    const setPageSize = (pageSize: number) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set('pageSize', String(pageSize));
            next.set('page', "1");
            return next;
        });
    };

    const setOrderBy = (orderBy: string | undefined) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev);
                if (orderBy) {
                    next.set('orderBy', orderBy);
                } else {
                    next.delete('orderBy');
                }
                return next;
            }

        );
    };

    const setTextFilters = (city: string | undefined, owner: string | undefined) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (city) next.set('city', city);
            else next.delete('city');
            if (owner) next.set('owner', owner);
            else next.delete('owner');
            next.set('page', '1');
            return next;
        });
    };

    const setStateFilter = (state: StationState | undefined) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            if (state) next.set('state', state);
            else next.delete('state');
            next.set('page', '1');
            return next;
        });
    };

    return {
        isLoading,
        error,
        stations,
        meta,
        parameters: { city, owner, state, orderBy, page, pageSize },
        setters: { setPage, setPageSize, setOrderBy, setTextFilters, setStateFilter },
        refresh,
    };
};