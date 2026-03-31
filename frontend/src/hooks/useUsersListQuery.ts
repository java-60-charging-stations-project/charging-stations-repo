import { fetchAdminUsers } from "@/services/api/adminApi";
import { getLogger } from "@/services/logging";
import type { ListUsersFilterType, UserShortType } from "@/types/users";
import { type ListUsersFilterKeyType } from "@/types/users";
import { useCallback, useEffect, useRef, useState } from "react";

const logger = getLogger("useUsersListQuery");

const FETCH_LIMIT = 5;

function buildFilters(filterKey: ListUsersFilterKeyType, filterValue: string): ListUsersFilterType | null {
    return (filterValue === "")? null: { filterKey, filterValue };
}

export function useUsersListQuery() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserShortType[]>([]);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [filters, setFilters] = useState<ListUsersFilterType | null>(null);
    const latestRequestIdRef = useRef(0);

    const fetchUsers = useCallback(
        async (requestFilters: ListUsersFilterType | null, isReplacing: boolean, token?: string) => {
            const requestId = ++latestRequestIdRef.current;
            setIsLoading(true);
            setError(null);
            try {
                logger.debug("Fetching users", {  filters: requestFilters, token, isReplacing, requestId });
                const { users: fetchedUsers, paginationToken, attemptsMade } = await fetchAdminUsers({
                    limit: FETCH_LIMIT,
                    ...(requestFilters ? { filter: requestFilters } : {}),
                    ...(token ? { paginationToken: token } : {}),
                });
                logger.debug(`Users count: ${fetchedUsers.length}, attempts: ${attemptsMade}`);

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
    }, [fetchUsers, filters]);

    const fetchMore = useCallback(async () => {
        if (!nextToken) {
            return;
        }

        await fetchUsers(filters, false, nextToken);
    }, [fetchUsers, filters, nextToken]);

    const refresh = useCallback(async () => {
        await fetchUsers(filters, true);
    }, [fetchUsers, filters]);

    const applyFilters = useCallback(
        (filterKey: ListUsersFilterKeyType, filterValue: string) => {
            setFilters((prev) => {
                const next = buildFilters(filterKey, filterValue);
                const isSame = (next === null) ? (prev === null) :
                    (prev && prev.filterKey === next.filterKey && prev.filterValue === next.filterValue);
                    
                return isSame ? prev : next;
            });
        }, []
    );

    const modifyByIndex = useCallback(
        (userIndex: number, partial: Partial<UserShortType>) => {
            setUsers(
                prevUsers => {
                    logger.debug(".modifyById index = ", userIndex);
                    const updated = { ...prevUsers[userIndex], ...partial };
                    const updatedUsers = [...prevUsers];
                    updatedUsers[userIndex] = updated;
                    
                    return updatedUsers;
                }
            );
        }
    , []);

    return {
        isLoading,
        error,
        users,
        appliedFilters: filters,
        hasMore: !!nextToken,
        fetchMore,
        refresh,
        applyFilters,
        modifyByIndex,
    };
}