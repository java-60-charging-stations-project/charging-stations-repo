import { useState, useEffect } from 'react';
import { adminAPI } from '@/api/client';
import StatusBadge from '@/components/common/StatusBadge';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ROLES } from '@/utils/constants';

interface User {
  userId: string;
  name?: string;
  email: string;
  role: string;
  blocked: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      const { data } = await adminAPI.listUsers();
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await adminAPI.changeRole(userId, newRole);
      loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to change role');
    }
  };

  const handleBlock = async (userId: string, blocked: boolean) => {
    try {
      await adminAPI.blockUser(userId, blocked);
      loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to update user');
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await adminAPI.deleteUser(userId);
      loadUsers();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      alert(axiosErr.response?.data?.message || 'Failed to delete user');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">User Management</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No users found</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.userId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{u.name || u.userId}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoleChange(u.userId, e.target.value)}
                      className="text-sm border border-gray-300 rounded px-2 py-1"
                    >
                      {Object.values(ROLES as Record<string, string>).map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.blocked ? 'ERROR' : 'ACTIVE'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleBlock(u.userId, !u.blocked)}
                        className={`text-xs px-2 py-1 rounded ${u.blocked ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}
                      >
                        {u.blocked ? 'Unblock' : 'Block'}
                      </button>
                      <button
                        onClick={() => handleDelete(u.userId)}
                        className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
