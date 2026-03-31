import { useCallback, useEffect, useState } from 'react';
import type { FC } from 'react';
import type { UserFullType } from '@/types/users';
import type { UserRole } from '@/types';
import { adminDisableUser, adminEnableUser, changeUserRole, fetchAdminUserById } from '@/services/api/adminApi';
import SimpleButton from '@/components/SimpleButton';
import type { ButtonColor } from '@/components/SimpleButton';
import { UserStatusBadge, UserRoleBadge } from '@/components/StatusBadge';
import { getLogger } from '@/services/logging';
import EasySpinner from './EasySpinner';
import { userStatusTransform } from '@/services/utils';

const logger = getLogger('EditUserForm');

// type ManageButtonProps = {
//     text: string;
//     hh: number;
//     ww: number;
//     onClick: () => void;
// }
// function ManageButton(props: ManageButtonProps):ReactNode {
//     const { text, hh = 7, ww, onClick } = props;
//     return (
//         <button
//             type="button"
//             onClick={onClick}
//             className={`h-${hh} w-${ww} rounded-md px-2.5 py-0.5 text-sm font-medium no-underline bg-slate-50 text-slate-800 hover:bg-slate-300 hover:text-black`}
//         >
//             { text }
//         </button >
//     );
// };

interface EditUserFormProps {
    userId: string;
    onUserUpdated?: (user: UserFullType) => void;
}

type RoleAction = { label: string; newRole: UserRole; color: ButtonColor };

function getRoleActions(currentRole: UserRole): RoleAction[] {
    switch (currentRole) {
        case 'USER':
            return [
                { label: 'Grant Support', newRole: 'SUPPORT', color: 'secondary' },
                { label: 'Grant Admin',   newRole: 'ADMIN',   color: 'secondary'   },
            ];
        case 'SUPPORT':
            return [
                { label: 'Revoke Support',  newRole: 'USER',  color: 'tertiary'  },
            ];
        case 'ADMIN':
            return [
                { label: 'Revoke Admin',  newRole: 'USER',    color: 'tertiary'  },
            ];
        default:
            return [];
    }
}

const EditUserForm: FC<EditUserFormProps> = ({ userId, onUserUpdated }) => {
    const [user, setUser] = useState<UserFullType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [lockLoading, setLockLoading] = useState(false);
    const [lockError, setLockError] = useState<string | null>(null);

    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError, setRoleError] = useState<string | null>(null);

    const loadUser = useCallback(
        async (): Promise<UserFullType | null> => {
            setIsLoading(true);
            setLoadError(null);
            let fetchedUser: UserFullType | null = null;
            try {
                fetchedUser = await fetchAdminUserById(userId);
                logger.debug('Fetched user id = ', fetchedUser.userId);
                setUser(fetchedUser);
            } catch (e) {
                logger.error('error loading user details:', e);
                setLoadError(e instanceof Error ? e.message : 'Failed to load user');
                setUser(null);
            } finally {
                setIsLoading(false);
            }
            return fetchedUser;
        }, [userId]
    );

    useEffect(() => {
        void loadUser();
    }, [loadUser]);

    const handleToggleLock = async () => {
        if (!user) return;
        setLockError(null);
        setLockLoading(true);
        try {
            let enabled = user.enabled;
            if (user.enabled) {
                await adminDisableUser(user.userId);
                enabled = false;
            } else {
                await adminEnableUser(user.userId);
                enabled = true;
            }
            const updatedUser = {...user, enabled};
            setUser(updatedUser);
            onUserUpdated?.(updatedUser);
        } catch (e) {
            setLockError(e instanceof Error ? e.message : 'Action failed');
        } finally {
            setLockLoading(false);
        }
    };

    const handleChangeRole = async (newRole: UserRole) => {
        if (!user) return;
        setRoleError(null);
        setRoleLoading(true);
        try {
            await changeUserRole(user.userId, { oldRole: user.role, newRole });
            const updatedUser = { ...user, role: newRole };
            setUser(updatedUser);
            onUserUpdated?.(updatedUser);
        } catch (e) {
            setRoleError(e instanceof Error ? e.message : 'Failed to update role');
        } finally {
            setRoleLoading(false);
        }
    };

    if (isLoading && !user) {
        return (
            <div className="w-full flex justify-center">
                <EasySpinner size="lg" />
            </div>
        );
    }

    if (loadError) {
        return <p className="mt-4 text-error-600 text-md">{loadError}</p>;
    }

    if (!user) return null;

    return (
        <table className="mt-4 border-collapse">
            <tbody>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Id</td>
                    <td className="py-2">{user.userId}</td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Email</td>
                    <td className="py-2">{user.email}</td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Name</td>
                    <td className="py-2">{user.name}</td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Lock status</td>
                    <td className="py-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <UserStatusBadge enabled={user.enabled} />
                            <SimpleButton
                                size="xs"
                                caption={user.enabled ? 'Disable user' : 'Enable user'}
                                isLoading={lockLoading}
                                loadingCaption="Processing..."
                                color={user.enabled ? 'secondary' : 'primary'}
                                handleClick={handleToggleLock}
                            />
                            {lockError && (
                                <span className="text-red-500 text-xs">{lockError}</span>
                            )}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Role</td>
                    <td className="py-2">
                        <div className="flex items-center gap-3 flex-wrap">
                            <UserRoleBadge role={user.role} />
                            {getRoleActions(user.role).map(({ label, newRole, color }) => (
                                <SimpleButton
                                    key={`${user.role}=${newRole}`}
                                    size="xs"
                                    caption={label}
                                    isLoading={roleLoading}
                                    loadingCaption="Updating..."
                                    color={color}
                                    handleClick={() => { void handleChangeRole(newRole); }}
                                />
                            ))}
                            {roleError && (
                                <span className="text-red-500 text-xs">{roleError}</span>
                            )}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Status</td>
                    <td className="py-2">{ userStatusTransform(user.status) }</td>
                </tr>
            </tbody>
        </table>
    );
};

export default EditUserForm;
