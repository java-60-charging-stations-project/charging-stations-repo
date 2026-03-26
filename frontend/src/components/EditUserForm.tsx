import { useState } from 'react';
import type { FC } from 'react';
import type { UserFullType } from '@/types/users';
import { adminDisableUser, adminEnableUser, changeUserRole } from '@/services/api/adminApi';
import SimpleButton from '@/components/SimpleButton';
import type { UserRole } from '@/types';
import { UserStatusBadge } from '@/components/StatusBadge';

const ALL_ROLES = ['USER', 'ADMIN', 'SUPPORT'] as const;

interface EditUserFormProps {
    user: UserFullType;
    onUserUpdated: () => void;
}

const EditUserForm: FC<EditUserFormProps> = ({ user, onUserUpdated }) => {
    const [lockLoading, setLockLoading] = useState(false);
    const [lockError, setLockError] = useState<string | null>(null);

    const [changeRoleFlag, setChangeRoleFlag] = useState(false);
    const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
    const [roleLoading, setRoleLoading] = useState(false);
    const [roleError, setRoleError] = useState<string | null>(null);

    const handleToggleLock = async () => {
        setLockError(null);
        setLockLoading(true);
        try {
            if (user.enabled) {
                await adminDisableUser(user.userId);
            } else {
                await adminEnableUser(user.userId);
            }
            onUserUpdated();
        } catch (e) {
            setLockError(e instanceof Error ? e.message : 'Action failed');
        } finally {
            setLockLoading(false);
        }
    };

    const handleUpdateRole = async () => {
        setRoleError(null);
        setRoleLoading(true);
        try {
            await changeUserRole(user.userId, {
                oldRole: user.role,
                newRole: selectedRole,
            });
            setChangeRoleFlag(false);
            onUserUpdated();
        } catch (e) {
            setRoleError(e instanceof Error ? e.message : 'Failed to update role');
        } finally {
            setRoleLoading(false);
        }
    };

    const isRoleChanged = selectedRole !== user.role;

    const handleChangeRoleFlag = (checked: boolean) => {
        setChangeRoleFlag(checked);
        if (!checked) {
            setSelectedRole(user.role);
            setRoleError(null);
        }
    };

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
                            <label className="flex items-center gap-1 cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    checked={changeRoleFlag}
                                    onChange={(e) => handleChangeRoleFlag(e.target.checked)}
                                />
                                Change role
                            </label>
                            <select
                                value={selectedRole}
                                disabled={!changeRoleFlag}
                                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                                className="text-xs border rounded px-1 py-0.5 disabled:opacity-50"
                            >
                                {ALL_ROLES.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                            <SimpleButton
                                size="xs"
                                caption="Update role"
                                isLoading={roleLoading}
                                loadingCaption="Updating..."
                                isDisabled={!changeRoleFlag || !isRoleChanged}
                                handleClick={handleUpdateRole}
                            />
                            {roleError && (
                                <span className="text-error-500 text-xs">{roleError}</span>
                            )}
                        </div>
                    </td>
                </tr>
                <tr>
                    <td className="pr-6 py-2 font-semibold align-top">Status</td>
                    <td className="py-2">{user.status}</td>
                </tr>
            </tbody>
        </table>
    );
};

export default EditUserForm;
