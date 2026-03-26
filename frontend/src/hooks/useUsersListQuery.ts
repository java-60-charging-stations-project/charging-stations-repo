import { fetchAdminUsers } from "@/services/api/adminApi";
import { getLogger } from "@/services/logging";
import type { ListUsersFilterType, UserShortType } from "@/types/users";
import { useCallback, useEffect, useRef, useState } from "react";

const logger = getLogger("useUsersListQuery");

const FETCH_LIMIT = 5;

export function useUsersListQuery() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserShortType[]>([]);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [filters, setFilters] = useState<ListUsersFilterType | undefined>(undefined);
    const latestRequestIdRef = useRef(0);

    const fetchUsers = useCallback(async (requestFilters: ListUsersFilterType | undefined, isReplacing: boolean, token?: string) => {
        const requestId = ++latestRequestIdRef.current;
        setIsLoading(true);
        setError(null);
        try {
            logger.debug("Fetching users", { filters: requestFilters, token, isReplacing, requestId });
            const { users: fetchedUsers, paginationToken } = await fetchAdminUsers({
                limit: FETCH_LIMIT,
                ...(requestFilters ? { filter: requestFilters } : {}),
                ...(token ? { paginationToken: token } : {}),
            });

            if (requestId !== latestRequestIdRef.current) {
                logger.debug("Ignoring stale users response", { requestId, latestRequestId: latestRequestIdRef.current });
                return;
            }

            setNextToken(paginationToken);
            if (isReplacing) {
                setUsers(fetchedUsers);
            }
            else {
                setUsers((prevUsers) => [...prevUsers, ...fetchedUsers]);
            }
        }
        catch (e) {
            if (requestId !== latestRequestIdRef.current) {
                logger.debug("Ignoring stale users error", { requestId, latestRequestId: latestRequestIdRef.current });
                return;
            }

            setError(e instanceof Error ? e.message : "Error fetching users");
        }
        finally {
            if (requestId === latestRequestIdRef.current) {
                setIsLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchUsers(filters, true);
    }, [fetchUsers, filters?.filterKey, filters?.filterValue]);

    const fetchMore = useCallback(async () => {
        if (!nextToken) {
            return;
        }

        await fetchUsers(filters, false, nextToken);
    }, [fetchUsers, filters, nextToken]);

    const applyFilters = useCallback((newFilters: ListUsersFilterType | undefined) => {
        setFilters((currentFilters) => {
            const isSameFilter =
                currentFilters?.filterKey === newFilters?.filterKey
                && currentFilters?.filterValue === newFilters?.filterValue;

            return isSameFilter ? currentFilters : newFilters;
        });
    }, []);

    return {
        isLoading,
        error,
        users,
        appliedFilters: filters,
        hasMore: !!nextToken,
        fetchMore,
        applyFilters,
    };
}