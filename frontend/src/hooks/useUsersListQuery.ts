import { fetchAdminUsers } from "@/services/api/adminApi";
import type { ListUsersFilterType, UserShortType } from "@/types/users";
import { useEffect, useState } from "react";
import { getLogger } from "@/services/logging";

const logger = getLogger("useUsersListQuery");

const FETCH_LIMIT = 5;

export function useUsersListQuery() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserShortType[]>([]);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);
    const [filters, setFilters] = useState<ListUsersFilterType | undefined>(undefined);

    const fetchUsers = async (isReplacing: boolean, token?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            if (isReplacing) {
                setUsers([]);
                setNextToken(undefined);
            }
            logger.debug('Fetching users', { filters, token });
            const {users: fetchedUsers, paginationToken} = await fetchAdminUsers({
                limit: FETCH_LIMIT,
                ...(filters? {filter: filters}: {}),
                ...(token? {paginationToken: token}: {})
            });
            setNextToken(paginationToken);
            if (isReplacing) {
                setUsers(fetchedUsers);
            }
            else {
                setUsers((prevUsers)=>[...prevUsers, ...fetchedUsers]);
            }
        }
        catch (e) {
            setError(e instanceof Error? e.message: "Error fetching users");
        }
        finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(true);
    }, [filters?.filterKey, filters?.filterValue]);

    const fetchMore = async () => {
        if (!nextToken) {
            return;
        }
        await fetchUsers(false, nextToken);
    };

    return {
        isLoading,
        error,
        users,
        hasMore: !!nextToken,
        fetchMore,
        setFilters,
    }
}