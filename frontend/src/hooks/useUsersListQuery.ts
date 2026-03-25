import { fetchAdminUsers } from "@/services/api/adminApi";
import type { UserShortType } from "@/types/users";
import { useEffect, useState } from "react";

const FETCH_LIMIT = 5;

export function useUsersListQuery() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [users, setUsers] = useState<UserShortType[]>([]);
    const [nextToken, setNextToken] = useState<string | undefined>(undefined);

    const fetchUsers = async (isReplacing: boolean, token?: string) => {
        setIsLoading(true);
        setError(null);
        try {
            if (isReplacing) {
                setUsers([]);
                setNextToken(undefined);
            }
            const {users: fetchedUsers, paginationToken} = await fetchAdminUsers({
                limit: FETCH_LIMIT,
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
    }, []);

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
    }
}