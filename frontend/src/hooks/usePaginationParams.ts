import { config } from "@/config/env";
import { useCallback } from "react";
import { useSearchParams } from "react-router";

export function usePaginationParams() {
    const [searchParams, setSearchParams] = useSearchParams();

    const getNumber = (key: string, fallback: number) => {
        const value = Number(searchParams.get(key));
        return Number.isFinite(value) && value > 0 ? value : fallback;
    };

    const page = getNumber('page', 1);
    const pageSize = getNumber('pageSize', config.defaultPageSize);

    const setPage = useCallback(
        (newPage: number) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('page', String(newPage));
                return next;
            });
        }, [setSearchParams]
    );

    const setPageSize = useCallback(
        (newPageSize: number) => {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('pageSize', String(newPageSize));
                next.set('page', '1');
                return next;
            });
        }, [setSearchParams]
    );

    return { page, pageSize, setPage, setPageSize };
};