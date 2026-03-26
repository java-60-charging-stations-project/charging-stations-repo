import { useParams } from 'react-router';
import NavButton from '@/components/NavButton';
import EditUserForm from '@/components/EditUserForm';

const USERS_LIST_PATH = '/admin/users';

const AdminUserEditPage = () => {
    const { userId } = useParams<{ userId: string }>();

    return (
        <div>
            <NavButton to={USERS_LIST_PATH} caption="Back to list" size="xs" />
            {userId
                ? <EditUserForm userId={userId} />
                : <p className="mt-4 text-red-600">No user ID specified.</p>
            }
        </div>
    );
};

export default AdminUserEditPage;
