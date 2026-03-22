import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { AdminUserDetailsResponse } from '@/types/users';
import { fetchAdminUserDetails } from '@/services/api/adminApi';
import { getLogger } from '@/services/logging';
import NavButton from '@/components/NavButton';
import EditUserForm from '@/components/EditUserForm';

const logger = getLogger('AdminUserEditPage');

const USERS_LIST_PATH = '/admin/users';

const AdminUserEditPage = () => {
    const { userId } = useParams<{ userId: string }>();

    const [user, setUser] = useState<AdminUserDetailsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUser = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchAdminUserDetails(userId);
            logger.debug('user details:', data);
            setUser(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load user details');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    if (isLoading) {
        return (
            <div>
                <NavButton to={USERS_LIST_PATH} caption="Back to list" size="xs" />
                <p className="mt-4">Loading...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <NavButton to={USERS_LIST_PATH} caption="Back to list" size="xs" />
                <div className="mt-4 text-red-500">
                    <p>Error: {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <NavButton to={USERS_LIST_PATH} caption="Back to list" size="xs" />
            {user && <EditUserForm user={user} onUserUpdated={loadUser} />}
        </div>
    );
};

export default AdminUserEditPage;
